// pnpm test -- weightedExit.integration.test.ts
import { describe, expect, test, beforeAll, beforeEach } from 'vitest';
import { config } from 'dotenv';
config();

import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';
import {
    SingleAssetExitInput,
    ProportionalExitInput,
    UnbalancedExitInput,
    ExitKind,
    Slippage,
    Token,
    TokenAmount,
    PoolStateInput,
    PoolExit,
    Address,
    Hex,
    CHAINS,
    ChainId,
    getPoolAddress,
    ExitInput,
} from '../src';
import { forkSetup } from './lib/utils/helper';
import { ExitTxInput } from './lib/utils/types';
import { doExit } from './lib/utils/exitHelper';

const chainId = ChainId.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545/';
const blockNumber = BigInt(18043296);
const poolId =
    '0x1a44e35d5451e0b78621a1b3e7a53dfaa306b1d000000000000000000000051b'; // baoETH-ETH StablePool

describe('composable stable exit test', () => {
    let txInput: ExitTxInput;
    let bptToken: Token;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        const poolInput = await api.getPool(poolId);

        const client = createTestClient({
            mode: 'hardhat',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        txInput = {
            client,
            poolExit: new PoolExit(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolInput,
            testAddress: '0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f', // Balancer DAO Multisig
            exitInput: {} as ExitInput,
            checkNativeBalance: false,
            chainId,
        };
        bptToken = new Token(chainId, poolInput.address, 18, 'BPT');
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [txInput.poolInput.address],
            undefined, // TODO: hardcode these values to improve test performance
            [parseUnits('1000', 18)],
            process.env.ETHEREUM_RPC_URL as string,
            blockNumber,
        );
    });

    test('single asset exit', async () => {
        const bptIndex = txInput.poolInput.tokens.findIndex(
            (t) => t.address === txInput.poolInput.address,
        );
        const { slippage } = txInput;
        const bptIn = TokenAmount.fromHumanAmount(bptToken, '1');
        const tokenOut = '0xf4edfad26ee0d23b69ca93112ecce52704e0006f'; // baoETH

        const exitInput: SingleAssetExitInput = {
            chainId,
            rpcUrl,
            bptIn,
            tokenOut,
            kind: ExitKind.SINGLE_ASSET,
        };
        const { queryResult, maxBptIn, minAmountsOut } = await doExit({
            ...txInput,
            exitInput,
        });

        // Query should use correct BPT amount
        expect(queryResult.bptIn.amount).to.eq(bptIn.amount);

        // We only expect single asset to have a value for exit
        expect(queryResult.tokenOutIndex).to.be.toBeDefined;
        queryResult.amountsOut
            .filter((_, index) => index !== bptIndex)
            .forEach((a, i) => {
                if (i === queryResult.tokenOutIndex)
                    expect(a.amount > BigInt(0)).to.be.true;
                else expect(a.amount === BigInt(0)).to.be.true;
            });

        // Confirm slippage - only to amounts out not bpt in
        const expectedMinAmountsOut = queryResult.amountsOut.map((a) =>
            slippage.removeFrom(a.amount),
        );
        expect(expectedMinAmountsOut).to.deep.eq(minAmountsOut);
        expect(maxBptIn).to.eq(bptIn.amount);
    });

    test('proportional exit', async () => {
        const bptIndex = txInput.poolInput.tokens.findIndex(
            (t) => t.address === txInput.poolInput.address,
        );
        const { slippage } = txInput;
        const bptIn = TokenAmount.fromHumanAmount(bptToken, '1');

        const exitInput: ProportionalExitInput = {
            chainId,
            rpcUrl,
            bptIn,
            kind: ExitKind.PROPORTIONAL,
        };
        const { queryResult, maxBptIn, minAmountsOut } = await doExit({
            ...txInput,
            exitInput,
        });

        // Query should use correct BPT amount
        expect(queryResult.bptIn.amount).to.eq(bptIn.amount);

        // We expect all assets to have a value for exit
        expect(queryResult.tokenOutIndex).to.be.undefined;
        queryResult.amountsOut
            .filter((_, index) => index !== bptIndex)
            .forEach((a) => {
                expect(a.amount > BigInt(0)).to.be.true;
            });

        // Confirm slippage - only to amounts out not bpt in
        const expectedMinAmountsOut = queryResult.amountsOut.map((a) =>
            slippage.removeFrom(a.amount),
        );
        expect(expectedMinAmountsOut).to.deep.eq(minAmountsOut);
        expect(maxBptIn).to.eq(bptIn.amount);
    });

    test('unbalanced exit', async () => {
        const bptIndex = txInput.poolInput.tokens.findIndex(
            (t) => t.address === txInput.poolInput.address,
        );
        const { poolInput, slippage } = txInput;

        const poolTokens = poolInput.tokens
            .filter((_, index) => index !== bptIndex)
            .map((t) => new Token(chainId, t.address, t.decimals));
        const amountsOut = poolTokens.map((t) =>
            TokenAmount.fromHumanAmount(t, '80'),
        );

        const exitInput: UnbalancedExitInput = {
            chainId,
            rpcUrl,
            amountsOut,
            kind: ExitKind.UNBALANCED,
        };
        const { queryResult, maxBptIn, minAmountsOut } = await doExit({
            ...txInput,
            exitInput,
        });

        // We expect a BPT input amount > 0
        expect(queryResult.bptIn.amount > BigInt(0)).to.be.true;

        // We expect assets to have same amount out as user defined
        expect(queryResult.tokenOutIndex).to.be.undefined;
        queryResult.amountsOut
            .filter((_, index) => index !== bptIndex)
            .forEach((a, i) => {
                expect(a.amount).to.eq(amountsOut[i].amount);
            });

        // Confirm slippage - only to bpt in, not amounts out
        const expectedMinAmountsOut = amountsOut.map((a) => a.amount);
        expect(expectedMinAmountsOut).to.deep.eq(
            minAmountsOut.filter((_, index) => index !== bptIndex),
        );
        const expectedMaxBptIn = slippage.applyTo(queryResult.bptIn.amount);
        expect(expectedMaxBptIn).to.deep.eq(maxBptIn);
    });

    test('exit with native asset', async () => {
        const bptIndex = txInput.poolInput.tokens.findIndex(
            (t) => t.address === txInput.poolInput.address,
        );

        const { slippage } = txInput;
        const bptIn = TokenAmount.fromHumanAmount(bptToken, '1');

        const exitInput: ProportionalExitInput = {
            chainId,
            rpcUrl,
            bptIn,
            kind: ExitKind.PROPORTIONAL,
            exitWithNativeAsset: true,
        };

        // Note - checking native balance
        const { queryResult, maxBptIn, minAmountsOut } = await doExit({
            ...txInput,
            exitInput,
            checkNativeBalance: true,
        });

        // Query should use correct BPT amount
        expect(queryResult.bptIn.amount).to.eq(bptIn.amount);

        // We expect all assets to have a value for exit
        expect(queryResult.tokenOutIndex).to.be.undefined;
        queryResult.amountsOut
            .filter((_, index) => index !== bptIndex)
            .forEach((a) => {
                expect(a.amount > BigInt(0)).to.be.true;
            });

        // Confirm slippage - only to amounts out not bpt in
        const expectedMinAmountsOut = queryResult.amountsOut
            .filter((_, index) => index !== bptIndex)
            .map((a) => slippage.removeFrom(a.amount));
        expect(expectedMinAmountsOut).to.deep.eq(
            minAmountsOut.filter((_, index) => index !== bptIndex),
        );
        expect(maxBptIn).to.eq(bptIn.amount);
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Hex): Promise<PoolStateInput> {
        const tokens = [
            {
                address:
                    '0x1a44e35d5451e0b78621a1b3e7a53dfaa306b1d0' as Address, // B-baoETH-ETH-BPT
                decimals: 18,
                index: 0,
            },
            {
                address:
                    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
                decimals: 18,
                index: 1,
            },
            {
                address:
                    '0xf4edfad26ee0d23b69ca93112ecce52704e0006f' as Address, // baoETH
                decimals: 18,
                index: 2,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'PHANTOM_STABLE',
            tokens,
        };
    }
}

/******************************************************************************/
