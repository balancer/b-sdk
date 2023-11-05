// pnpm test -- weightedExit.integration.test.ts
import { describe, expect, test, beforeAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

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
import { assertProportionalExit, assertSingleTokenExit, assertUnbalancedExit, doExit } from './lib/utils/exitHelper';
import { ExitTxInput } from './lib/utils/types';

const chainId = ChainId.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545/';
const poolId =
    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH

describe('weighted exit test', () => {
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
            const poolTokens = txInput.poolStateInput.tokens
                .map((t) => new Token(chainId, t.address, t.decimals))

            amountsOut = poolTokens.map((t) =>
                TokenAmount.fromHumanAmount(t, '1'),
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
            type: 'WEIGHTED',
            tokens,
        };
    }
}

/******************************************************************************/
