// pnpm test -- removeLiquidity/gyroEV2.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    http,
    parseEther,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';
import {
    RemoveLiquiditySingleTokenExactInInput,
    RemoveLiquidityProportionalInput,
    RemoveLiquidityUnbalancedInput,
    RemoveLiquidityKind,
    Slippage,
    PoolState,
    RemoveLiquidity,
    Address,
    Hex,
    CHAINS,
    ChainId,
    getPoolAddress,
    RemoveLiquidityInput,
    InputAmount,
    PoolType,
    RemoveLiquiditySingleTokenExactOutInput,
    removeLiquidityProportionalOnlyError,
} from '../../../src';
import {
    assertRemoveLiquidityProportional,
    doRemoveLiquidity,
    forkSetup,
    RemoveLiquidityTxInput,
    TOKENS,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const chainId = ChainId.MAINNET;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const poolId =
    '0xf01b0684c98cd7ada480bfdf6e43876422fa1fc10002000000000000000005de'; // ECLP-wstETH-wETH

const wETH = TOKENS[chainId].WETH;

describe('GyroE V2 remove liquidity test', () => {
    let txInput: RemoveLiquidityTxInput;
    let poolState: PoolState;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);

        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        txInput = {
            client,
            removeLiquidity: new RemoveLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState: poolState,
            testAddress: '0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f', // Balancer DAO Multisig
            removeLiquidityInput: {} as RemoveLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [txInput.poolState.address],
            [0],
            [parseUnits('1000', 18)],
        );
    });

    describe('proportional', () => {
        let input: RemoveLiquidityProportionalInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('0.01'),
                decimals: 18,
                address: poolState.address,
            };
            input = {
                bptIn,
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
            });

            assertRemoveLiquidityProportional(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                chainId,
            );
        });
        test('with native', async () => {
            const wethIsEth = true;
            const removeLiquidityInput = {
                ...input,
            };
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput,
                wethIsEth,
            });
            assertRemoveLiquidityProportional(
                txInput.poolState,
                removeLiquidityInput,
                removeLiquidityOutput,
                txInput.slippage,
                chainId,
                2,
                wethIsEth,
            );
        });
    });

    describe('unbalanced', async () => {
        let input: Omit<RemoveLiquidityUnbalancedInput, 'amountsOut'>;
        let amountsOut: InputAmount[];
        beforeAll(() => {
            amountsOut = poolState.tokens.map((t) => ({
                rawAmount: parseUnits('0.001', t.decimals),
                decimals: t.decimals,
                address: t.address,
            }));
            input = {
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.Unbalanced,
            };
        });
        test('must throw remove liquidity kind not supported error', async () => {
            const removeLiquidityInput = {
                ...input,
                amountsOut: amountsOut.slice(0, 1),
            };
            await expect(() =>
                doRemoveLiquidity({ ...txInput, removeLiquidityInput }),
            ).rejects.toThrowError(
                removeLiquidityProportionalOnlyError(
                    removeLiquidityInput.kind,
                    poolState.type,
                ),
            );
        });
    });

    describe('single token exact out', async () => {
        let input: Omit<RemoveLiquiditySingleTokenExactOutInput, 'amountOut'>;
        let amountOut: InputAmount;
        beforeAll(() => {
            amountOut = {
                rawAmount: parseUnits('0.001', wETH.decimals),
                decimals: wETH.decimals,
                address: wETH.address,
            };
            input = {
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.SingleTokenExactOut,
            };
        });
        test('must throw remove liquidity kind not supported error', async () => {
            const removeLiquidityInput = {
                ...input,
                amountOut,
            };
            await expect(() =>
                doRemoveLiquidity({ ...txInput, removeLiquidityInput }),
            ).rejects.toThrowError(
                removeLiquidityProportionalOnlyError(
                    removeLiquidityInput.kind,
                    poolState.type,
                ),
            );
        });
    });

    describe('single token exact in', () => {
        let input: RemoveLiquiditySingleTokenExactInInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            };
            const tokenOut = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
            input = {
                chainId,
                rpcUrl,
                bptIn,
                tokenOut,
                kind: RemoveLiquidityKind.SingleTokenExactIn,
            };
        });
        test('must throw remove liquidity kind not supported error', async () => {
            await expect(() =>
                doRemoveLiquidity({ ...txInput, removeLiquidityInput: input }),
            ).rejects.toThrowError(
                removeLiquidityProportionalOnlyError(
                    input.kind,
                    poolState.type,
                ),
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/
class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.GyroE,
            tokens: [
                {
                    address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wstETH
                    decimals: 18,
                    index: 0,
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // wETH
                    decimals: 18,
                    index: 1,
                },
            ],
            protocolVersion: 2,
        };
    }
}

/******************************************************************************/
