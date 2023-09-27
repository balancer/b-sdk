// pnpm test -- weightedExit.integration.test.ts
import { describe, expect, test, beforeAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import {
    Client,
    createTestClient,
    http,
    parseUnits,
    publicActions,
    PublicActions,
    TestActions,
    WalletActions,
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
    replaceWrapped,
    PoolStateInput,
    PoolExit,
    Address,
    Hex,
    CHAINS,
    ChainId,
    getPoolAddress,
    ExitInput,
} from '../src';
import { forkSetup, sendTransactionGetBalances } from './lib/utils/helper';

type TxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    poolExit: PoolExit;
    exitInput: ExitInput;
    slippage: Slippage;
    poolInput: PoolStateInput;
    testAddress: Address;
    checkNativeBalance: boolean;
};

const chainId = ChainId.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545/';
const blockNumber = 18043296n;
const poolId =
    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH

describe('weighted exit test', () => {
    let txInput: TxInput;
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
            testAddress: '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f', // Balancer DAO Multisig
            exitInput: {} as ExitInput,
            checkNativeBalance: false,
        };
        bptToken = new Token(chainId, poolInput.address, 18, 'BPT');
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [txInput.poolInput.address],
            undefined, // TODO: hardcode these values to improve test performance
            [parseUnits('1', 18)],
            process.env.ETHEREUM_RPC_URL as string,
            blockNumber,
        );
    });

    test('single asset exit', async () => {
        const { slippage } = txInput;
        const bptIn = TokenAmount.fromHumanAmount(bptToken, '1');
        const tokenOut = '0xba100000625a3754423978a60c9317c58a424e3D'; // BAL

        const exitInput: SingleAssetExitInput = {
            chainId,
            rpcUrl,
            bptIn,
            tokenOut,
            kind: ExitKind.SINGLE_ASSET,
        };
        const { queryResult, maxBptIn, minAmountsOut } = await doTransaction({
            ...txInput,
            exitInput,
        });

        // Query should use correct BPT amount
        expect(queryResult.bptIn.amount).to.eq(bptIn.amount);

        // We only expect single asset to have a value for exit
        expect(queryResult.tokenOutIndex).to.be.toBeDefined;
        queryResult.amountsOut.forEach((a, i) => {
            if (i === queryResult.tokenOutIndex)
                expect(a.amount > 0n).to.be.true;
            else expect(a.amount === 0n).to.be.true;
        });

        // Confirm slippage - only to amounts out not bpt in
        const expectedMinAmountsOut = queryResult.amountsOut.map((a) =>
            slippage.removeFrom(a.amount),
        );
        expect(expectedMinAmountsOut).to.deep.eq(minAmountsOut);
        expect(maxBptIn).to.eq(bptIn.amount);
    });

    test('proportional exit', async () => {
        const { slippage } = txInput;
        const bptIn = TokenAmount.fromHumanAmount(bptToken, '1');

        const exitInput: ProportionalExitInput = {
            chainId,
            rpcUrl,
            bptIn,
            kind: ExitKind.PROPORTIONAL,
        };
        const { queryResult, maxBptIn, minAmountsOut } = await doTransaction({
            ...txInput,
            exitInput,
        });

        // Query should use correct BPT amount
        expect(queryResult.bptIn.amount).to.eq(bptIn.amount);

        // We expect all assets to have a value for exit
        expect(queryResult.tokenOutIndex).to.be.undefined;
        queryResult.amountsOut.forEach((a) => {
            expect(a.amount > 0n).to.be.true;
        });

        // Confirm slippage - only to amounts out not bpt in
        const expectedMinAmountsOut = queryResult.amountsOut.map((a) =>
            slippage.removeFrom(a.amount),
        );
        expect(expectedMinAmountsOut).to.deep.eq(minAmountsOut);
        expect(maxBptIn).to.eq(bptIn.amount);
    });

    test('unbalanced exit', async () => {
        const { poolInput, slippage } = txInput;

        const poolTokens = poolInput.tokens.map(
            (t) => new Token(chainId, t.address, t.decimals),
        );
        const amountsOut = poolTokens.map((t) =>
            TokenAmount.fromHumanAmount(t, '0.001'),
        );

        const exitInput: UnbalancedExitInput = {
            chainId,
            rpcUrl,
            amountsOut,
            kind: ExitKind.UNBALANCED,
        };
        const { queryResult, maxBptIn, minAmountsOut } = await doTransaction({
            ...txInput,
            exitInput,
        });

        // We expect a BPT input amount > 0
        expect(queryResult.bptIn.amount > 0n).to.be.true;

        // We expect assets to have same amount out as user defined
        expect(queryResult.tokenOutIndex).to.be.undefined;
        queryResult.amountsOut.forEach((a, i) => {
            expect(a.amount).to.eq(amountsOut[i].amount);
        });

        // Confirm slippage - only to bpt in, not amounts out
        const expectedMinAmountsOut = amountsOut.map((a) => a.amount);
        expect(expectedMinAmountsOut).to.deep.eq(minAmountsOut);
        const expectedMaxBptIn = slippage.applyTo(queryResult.bptIn.amount);
        expect(expectedMaxBptIn).to.deep.eq(maxBptIn);
    });

    test('exit with native asset', async () => {
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
        const { queryResult, maxBptIn, minAmountsOut } = await doTransaction({
            ...txInput,
            exitInput,
            checkNativeBalance: true,
        });

        // Query should use correct BPT amount
        expect(queryResult.bptIn.amount).to.eq(bptIn.amount);

        // We expect all assets to have a value for exit
        expect(queryResult.tokenOutIndex).to.be.undefined;
        queryResult.amountsOut.forEach((a) => {
            expect(a.amount > 0n).to.be.true;
        });

        // Confirm slippage - only to amounts out not bpt in
        const expectedMinAmountsOut = queryResult.amountsOut.map((a) =>
            slippage.removeFrom(a.amount),
        );
        expect(expectedMinAmountsOut).to.deep.eq(minAmountsOut);
        expect(maxBptIn).to.eq(bptIn.amount);
    });

    async function doTransaction(txIp: TxInput) {
        const {
            poolExit,
            poolInput,
            exitInput,
            testAddress,
            client,
            slippage,
            checkNativeBalance,
        } = txIp;
        const queryResult = await poolExit.query(exitInput, poolInput);

        const { call, to, value, maxBptIn, minAmountsOut } = poolExit.buildCall(
            {
                ...queryResult,
                slippage,
                sender: testAddress,
                recipient: testAddress,
            },
        );

        const poolTokens = poolInput.tokens.map(
            (t) => new Token(chainId, t.address, t.decimals),
        );

        // Replace with native asset if required
        const poolTokensAddr = checkNativeBalance
            ? replaceWrapped(poolTokens, chainId).map((t) => t.address)
            : poolTokens.map((t) => t.address);

        // send transaction and check balance changes
        const { transactionReceipt, balanceDeltas } =
            await sendTransactionGetBalances(
                [...poolTokensAddr, poolInput.address],
                client,
                testAddress,
                to,
                call,
                value,
            );
        expect(transactionReceipt.status).to.eq('success');

        // Confirm final balance changes match query result
        const expectedDeltas = [
            ...queryResult.amountsOut.map((a) => a.amount),
            queryResult.bptIn.amount,
        ];
        expect(expectedDeltas).to.deep.eq(balanceDeltas);

        return {
            queryResult,
            maxBptIn,
            minAmountsOut,
        };
    }
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Hex): Promise<PoolStateInput> {
        let tokens: { address: Address; decimals: number; index: number }[] =
            [];
        if (
            id ===
            '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'
        ) {
            tokens = [
                {
                    address: '0xba100000625a3754423978a60c9317c58a424e3d', // BAL
                    decimals: 18,
                    index: 0,
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // wETH
                    decimals: 18,
                    index: 1,
                },
            ];
        } else if (
            id ===
            '0x87a867f5d240a782d43d90b6b06dea470f3f8f22000200000000000000000516'
        ) {
            tokens = [
                {
                    address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wstETH slot 0
                    decimals: 18,
                    index: 0,
                },
                {
                    address: '0xc00e94cb662c3520282e6f5717214004a7f26888', // COMP slot 1
                    decimals: 18,
                    index: 1,
                },
            ];
        }
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'Weighted',
            tokens,
        };
    }
}

/******************************************************************************/
