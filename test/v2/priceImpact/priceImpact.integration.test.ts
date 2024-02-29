// pnpm test -- priceImpact/priceImpact.integration.test.ts

import dotenv from 'dotenv';
dotenv.config();

import { parseEther } from 'viem';

import {
    AddLiquidityKind,
    AddLiquiditySingleTokenInput,
    AddLiquidityUnbalancedInput,
    Address,
    ChainId,
    getPoolAddress,
    Hex,
    InputAmount,
    Path,
    PoolState,
    PoolType,
    PriceImpact,
    PriceImpactAmount,
    RemoveLiquidityKind,
    RemoveLiquiditySingleTokenExactInInput,
    RemoveLiquidityUnbalancedInput,
    SwapKind,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';

const block = 18559730n;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET, undefined, block);
const chainId = ChainId.MAINNET;

const poolId = POOLS[chainId].wstETH_rETH_sfrxETH.id;
const wstETH = TOKENS[chainId].wstETH;
const sfrxETH = TOKENS[chainId].sfrxETH;
const rETH = TOKENS[chainId].rETH;

const BAL_WETH = POOLS[chainId].BAL_WETH;
const wstETH_wETH = POOLS[chainId].wstETH_wETH;
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('price impact', () => {
    let poolState: PoolState;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);
    });

    describe('add liquidity single token', () => {
        let bptOut: InputAmount;
        let input: AddLiquiditySingleTokenInput;
        beforeAll(() => {
            bptOut = {
                rawAmount: 113693119026587239920n,
                decimals: 18,
                address: poolState.address,
            };
            input = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.SingleToken,
                bptOut,
                tokenIn: wstETH.address,
            };
        });
        test('ABA close to Spot Price', async () => {
            const priceImpactABA = await PriceImpact.addLiquiditySingleToken(
                input,
                poolState,
            );
            const priceImpactSpot = PriceImpactAmount.fromDecimal(
                '0.000315905711879544', // from previous SDK/SOR
            );
            expect(priceImpactABA.decimal).closeTo(
                priceImpactSpot.decimal,
                1e-4, // 1 bps
            );
        });
    });

    describe('add liquidity unbalanced', () => {
        let amountsIn: InputAmount[];
        let input: AddLiquidityUnbalancedInput;
        beforeAll(() => {
            amountsIn = poolState.tokens.map((t, i) => {
                return {
                    rawAmount:
                        i === 0
                            ? 0n
                            : parseEther((10n ** BigInt(i)).toString()),
                    decimals: t.decimals,
                    address: t.address,
                };
            });

            input = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
                amountsIn,
            };
        });
        test('ABA close to Spot Price', async () => {
            const priceImpactABA = await PriceImpact.addLiquidityUnbalanced(
                input,
                poolState,
            );
            const priceImpactSpot = PriceImpactAmount.fromDecimal(
                '0.001395038034686279', // from previous SDK/SOR
            );
            expect(priceImpactABA.decimal).closeTo(
                priceImpactSpot.decimal,
                1e-3, // 100 bps
            );
        });
    });

    describe('swap', () => {
        let pathBalWeth: Path;
        let pathBalWethWsteth: Path;
        beforeAll(() => {
            pathBalWeth = {
                balancerVersion: 2,
                tokens: [
                    {
                        address: BAL.address,
                        decimals: BAL.decimals,
                    },
                    {
                        address: WETH.address,
                        decimals: WETH.decimals,
                    },
                ],
                pools: [BAL_WETH.id],
                inputAmountRaw: 100000000000000000000000n,
                outputAmountRaw: 196372838414869690332n,
            };
            pathBalWethWsteth = {
                ...pathBalWeth,
                tokens: [
                    ...pathBalWeth.tokens,
                    {
                        address: wstETH.address,
                        decimals: wstETH.decimals,
                    },
                ],
                pools: [...pathBalWeth.pools, wstETH_wETH.id],
                outputAmountRaw: 171347288436104819088n,
            };
        });

        describe('single swap', () => {
            const priceImpactSpot = PriceImpactAmount.fromDecimal(
                '0.01740850105233393', // from previous SDK/SOR
            );
            describe('given in', () => {
                test('ABA close to Spot Price', async () => {
                    const priceImpactABA = await PriceImpact.swap(
                        {
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenIn,
                        },
                        rpcUrl,
                        block,
                    );
                    expect(priceImpactABA.decimal).closeTo(
                        priceImpactSpot.decimal,
                        1e-3, // 1 bps
                    );
                });
            });

            describe('given out', () => {
                test('ABA close to Spot Price', async () => {
                    const priceImpactABA = await PriceImpact.swap(
                        {
                            chainId,
                            paths: [pathBalWeth],
                            swapKind: SwapKind.GivenOut,
                        },
                        rpcUrl,
                    );
                    expect(priceImpactABA.decimal).closeTo(
                        priceImpactSpot.decimal,
                        1e-3, // 1 bps
                    );
                });
            });
        });

        describe('batch swap', () => {
            const priceImpactSpot = PriceImpactAmount.fromDecimal(
                '0.017440413722011654', // from previous SDK/SOR
            );
            describe('given in', () => {
                test('ABA close to Spot Price', async () => {
                    const priceImpactABA = await PriceImpact.swap(
                        {
                            chainId,
                            paths: [pathBalWethWsteth],
                            swapKind: SwapKind.GivenIn,
                        },
                        rpcUrl,
                        block,
                    );
                    expect(priceImpactABA.decimal).closeTo(
                        priceImpactSpot.decimal,
                        1e-3, // 1 bps
                    );
                });
            });

            describe('given out', () => {
                test('ABA close to Spot Price', async () => {
                    const priceImpactABA = await PriceImpact.swap(
                        {
                            chainId,
                            paths: [pathBalWethWsteth],
                            swapKind: SwapKind.GivenOut,
                        },
                        rpcUrl,
                    );
                    expect(priceImpactABA.decimal).closeTo(
                        priceImpactSpot.decimal, // we can use the same value for comparison, because test conditions are the same
                        1e-3, // 1 bps
                    );
                });
            });
        });
    });

    describe('remove liquidity single token', () => {
        let input: RemoveLiquiditySingleTokenExactInInput;
        beforeAll(() => {
            input = {
                chainId,
                rpcUrl,
                bptIn: {
                    rawAmount: parseEther('100'),
                    decimals: 18,
                    address: poolState.address,
                },
                tokenOut: wstETH.address,
                kind: RemoveLiquidityKind.SingleTokenExactIn,
            };
        });
        test('ABA close to Spot Price', async () => {
            const priceImpactABA = await PriceImpact.removeLiquidity(
                input,
                poolState,
            );
            const priceImpactSpot = PriceImpactAmount.fromDecimal(
                '0.000314661068454677', // from previous SDK/SOR
            );
            expect(priceImpactABA.decimal).closeTo(
                priceImpactSpot.decimal,
                1e-4, // 1 bps
            );
        });
    });

    describe('remove liquidity unbalanced', () => {
        let input: RemoveLiquidityUnbalancedInput;
        beforeAll(() => {
            const amounts = ['0', '1000', '100', '10'];
            input = {
                chainId,
                rpcUrl,
                amountsOut: poolState.tokens.map((t, i) => {
                    return {
                        rawAmount: parseEther(amounts[i]),
                        decimals: t.decimals,
                        address: t.address,
                    };
                }),
                kind: RemoveLiquidityKind.Unbalanced,
            };
        });
        test('ABA close to Spot Price', async () => {
            const priceImpactABA = await PriceImpact.removeLiquidity(
                input,
                poolState,
            );
            const priceImpactSpot = PriceImpactAmount.fromDecimal(
                '0.000478949021982815', // from previous SDK/SOR
            );
            expect(priceImpactABA.decimal).closeTo(
                priceImpactSpot.decimal,
                1e-4, // 1 bps
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: getPoolAddress(id) as Address,
                decimals: 18,
                index: 0,
            },
            {
                address: wstETH.address,
                decimals: wstETH.decimals,
                index: 1,
            },
            {
                address: sfrxETH.address,
                decimals: sfrxETH.decimals,
                index: 2,
            },
            {
                address: rETH.address,
                decimals: rETH.decimals,
                index: 2,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.ComposableStable,
            tokens,
            balancerVersion: 2,
        };
    }
}

/******************************************************************************/
