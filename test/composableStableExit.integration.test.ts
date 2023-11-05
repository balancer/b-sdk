// pnpm test -- weightedExit.integration.test.ts
import { describe, test, beforeAll, beforeEach } from 'vitest';
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
import {
    assertProportionalExit,
    assertSingleTokenExit,
    assertUnbalancedExit,
    doExit,
} from './lib/utils/exitHelper';

const chainId = ChainId.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545/';
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
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        txInput = {
            client,
            poolExit: new PoolExit(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolStateInput: poolInput,
            testAddress: '0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f', // Balancer DAO Multisig
            exitInput: {} as ExitInput,
        };
        bptToken = new Token(chainId, poolInput.address, 18, 'BPT');
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [txInput.poolStateInput.address],
            undefined, // TODO: hardcode these values to improve test performance
            [parseUnits('1000', 18)],
        );
    });

    describe('unbalanced exit', async () => {
        let input: Omit<UnbalancedExitInput, 'amountsOut'>;
        let amountsOut: TokenAmount[];
        beforeAll(() => {
            const bptIndex = txInput.poolStateInput.tokens.findIndex(
                (t) => t.address === txInput.poolStateInput.address,
            );
            const poolTokensWithoutBpt = txInput.poolStateInput.tokens
                .map((t) => new Token(chainId, t.address, t.decimals))
                .filter((_, index) => index !== bptIndex);

            amountsOut = poolTokensWithoutBpt.map((t) =>
                TokenAmount.fromHumanAmount(t, '20'),
            );
            input = {
                chainId,
                rpcUrl,
                kind: ExitKind.Unbalanced,
            };
        });
        test('exiting with wrapped', async () => {
            const exitInput = {
                ...input,
                amountsOut: amountsOut.slice(0, 1),
            };
            const exitResult = await doExit({ ...txInput, exitInput });
            assertUnbalancedExit(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                exitInput,
                exitResult,
                txInput.slippage,
            );
        });
        test('exiting with native', async () => {
            const exitInput = {
                ...input,
                amountsOut: amountsOut.slice(0, 1),
                exitWithNativeAsset: true,
            };
            const exitResult = await doExit({
                ...txInput,
                exitInput,
            });
            assertUnbalancedExit(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                exitInput,
                exitResult,
                txInput.slippage,
            );
        });
    });

    describe('single asset exit', () => {
        let input: SingleAssetExitInput;
        beforeAll(() => {
            const bptIn = TokenAmount.fromHumanAmount(bptToken, '1');
            const tokenOut = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
            input = {
                chainId,
                rpcUrl,
                bptIn,
                tokenOut,
                kind: ExitKind.SingleAsset,
            };
        });
        test('exiting with wrapped', async () => {
            const exitResult = await doExit({
                ...txInput,
                exitInput: input,
            });

            assertSingleTokenExit(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                input,
                exitResult,
                txInput.slippage,
            );
        });

        test('exiting with native', async () => {
            const exitInput = {
                ...input,
                exitWithNativeAsset: true,
            };
            const exitResult = await doExit({
                ...txInput,
                exitInput,
            });

            assertSingleTokenExit(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                exitInput,
                exitResult,
                txInput.slippage,
            );
        });
    });

    describe('proportional exit', () => {
        let input: ProportionalExitInput;
        beforeAll(() => {
            const bptIn = TokenAmount.fromHumanAmount(bptToken, '1');
            input = {
                bptIn,
                chainId,
                rpcUrl,
                kind: ExitKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const exitResult = await doExit({
                ...txInput,
                exitInput: input,
            });

            assertProportionalExit(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                input,
                exitResult,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const exitInput = {
                ...input,
                useNativeAssetAsWrappedAmountIn: true,
            };
            const exitResult = await doExit({
                ...txInput,
                exitInput,
            });
            assertProportionalExit(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                exitInput,
                exitResult,
                txInput.slippage,
            );
        });
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
