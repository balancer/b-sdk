// pnpm test -- priceImpact/priceImpact.integration.test.ts

import dotenv from 'dotenv';
dotenv.config();

import {
    AddLiquiditySingleTokenInput,
    AddLiquidityKind,
    Address,
    Hex,
    PoolState,
    ChainId,
    getPoolAddress,
    InputAmount,
    AddLiquidityUnbalancedInput,
    SwapKind,
    RemoveLiquiditySingleTokenExactInInput,
    RemoveLiquidityKind,
    RemoveLiquidityUnbalancedInput,
    PoolType,
    RemoveLiquidityNestedSingleTokenInput,
    NestedPoolState,
    ZERO_ADDRESS,
    AddLiquidityNestedInput,
} from '../../../src';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { PriceImpact } from '../../../src/entities/priceImpact';
import { PriceImpactAmount } from '../../../src/entities/priceImpactAmount';
import { parseEther, parseUnits } from 'viem';
import { SingleSwapInput } from '../../../src/entities/utils/doSingleSwapQuery';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';

const { rpcUrl } = await startFork(
    ANVIL_NETWORKS.MAINNET,
    undefined,
    18559730n,
);
const chainId = ChainId.MAINNET;

// pool and tokenn
const wstETH = TOKENS[chainId].wstETH;
const rETH = TOKENS[chainId].rETH;
const sfrxETH = TOKENS[chainId].sfrxETH;
const wstETH_rETH_sfrxETH = POOLS[chainId].wstETH_rETH_sfrxETH;

// nested pool and tokens
const DAI = TOKENS[chainId].DAI;
const WETH = TOKENS[chainId].WETH;
const USDC = TOKENS[chainId].USDC;
const USDT = TOKENS[chainId].USDT;
const BPT_3POOL = POOLS[chainId].BPT_3POOL;
const BPT_WETH_3POOL = POOLS[chainId].BPT_WETH_3POOL;

describe('price impact', () => {
    let poolState: PoolState;
    let nestedPoolState: NestedPoolState;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(wstETH_rETH_sfrxETH.id);
        nestedPoolState = await api.getNestedPool(BPT_WETH_3POOL.id);
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
                            : parseUnits(
                                  (10n ** BigInt(i)).toString(),
                                  t.decimals,
                              ),
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

    describe('add liquidity nested - unbalanced', () => {
        let input: AddLiquidityNestedInput;
        beforeAll(() => {
            input = {
                chainId,
                rpcUrl,
                accountAddress: ZERO_ADDRESS,
                amountsIn: [
                    {
                        address: DAI.address,
                        rawAmount: parseUnits('100000', DAI.decimals),
                        decimals: DAI.decimals,
                    },
                    {
                        address: USDC.address,
                        rawAmount: parseUnits('1000', USDC.decimals),
                        decimals: USDC.decimals,
                    },
                    {
                        address: USDT.address,
                        rawAmount: parseUnits('10', USDT.decimals),
                        decimals: USDT.decimals,
                    },
                    {
                        address: WETH.address,
                        rawAmount: parseUnits('0.1', WETH.decimals),
                        decimals: WETH.decimals,
                    },
                ],
            };
        });
        test('ABA close to Spot Price', async () => {
            const priceImpactABA = await PriceImpact.addLiquidityNested(
                input,
                nestedPoolState,
            );
            const priceImpactSpot = PriceImpactAmount.fromDecimal(
                '0.0472', // TODO: find a way to validate this result
            );
            expect(priceImpactABA.decimal).closeTo(
                priceImpactSpot.decimal,
                1e-4, // 1 bps
            );
        });
    });

    describe('swap', () => {
        let input: SingleSwapInput;
        describe('given in', () => {
            beforeAll(() => {
                input = {
                    poolId: wstETH_rETH_sfrxETH.id,
                    kind: SwapKind.GivenIn,
                    assetIn: wstETH.address,
                    assetOut: rETH.address,
                    amount: parseUnits('100', wstETH.decimals),
                    userData: '0x',
                    chainId,
                    rpcUrl,
                };
            });
            test('ABA close to Spot Price', async () => {
                const priceImpactABA = await PriceImpact.singleSwap(input);
                const priceImpactSpot = PriceImpactAmount.fromDecimal(
                    '0.0006892372576572821', // from previous SDK/SOR
                );
                expect(priceImpactABA.decimal).closeTo(
                    priceImpactSpot.decimal,
                    1e-4, // 1 bps
                );
            });
        });

        describe('given out', () => {
            beforeAll(() => {
                input = {
                    poolId: wstETH_rETH_sfrxETH.id,
                    kind: SwapKind.GivenOut,
                    assetIn: wstETH.address,
                    assetOut: rETH.address,
                    amount: parseUnits('100', wstETH.decimals),
                    userData: '0x',
                    chainId,
                    rpcUrl,
                };
            });
            test('ABA close to Spot Price', async () => {
                const priceImpactABA = await PriceImpact.singleSwap(input);
                const priceImpactSpot = PriceImpactAmount.fromDecimal(
                    '0.0006892372576572821', // from previous SDK/SOR
                );
                expect(priceImpactABA.decimal).closeTo(
                    priceImpactSpot.decimal,
                    1e-4, // 1 bps
                );
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

    describe('remove liquidity nested - single token', () => {
        let input: RemoveLiquidityNestedSingleTokenInput;
        beforeAll(() => {
            input = {
                chainId,
                rpcUrl,
                bptAmountIn: parseEther('1200'),
                accountAddress: ZERO_ADDRESS,
                tokenOut: WETH.address,
            };
        });
        test('ABA close to Spot Price', async () => {
            const priceImpactABA = await PriceImpact.removeLiquidityNested(
                input,
                nestedPoolState,
            );
            const priceImpactSpot = PriceImpactAmount.fromDecimal(
                '0.0288', // TODO: find a way to validate this result
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

    public async getNestedPool(poolId: Hex): Promise<NestedPoolState> {
        if (poolId !== BPT_WETH_3POOL.id) throw Error();
        return {
            pools: [
                {
                    id: BPT_WETH_3POOL.id,
                    address: BPT_WETH_3POOL.address,
                    type: BPT_WETH_3POOL.type,
                    level: 1,
                    tokens: [
                        {
                            address: BPT_3POOL.address,
                            decimals: BPT_3POOL.decimals,
                            index: 0,
                        },
                        {
                            address: WETH.address,
                            decimals: WETH.decimals,
                            index: 1,
                        },
                    ],
                },
                {
                    id: BPT_3POOL.id,
                    address: BPT_3POOL.address,
                    type: BPT_3POOL.type,
                    level: 0,
                    tokens: [
                        {
                            address: DAI.address,
                            decimals: DAI.decimals,
                            index: 0,
                        },
                        {
                            address: BPT_3POOL.address,
                            decimals: BPT_3POOL.decimals,
                            index: 1,
                        },
                        {
                            address: USDC.address,
                            decimals: USDC.decimals,
                            index: 2,
                        },
                        {
                            address: USDT.address,
                            decimals: USDT.decimals,
                            index: 3,
                        },
                    ],
                },
            ],
            mainTokens: [
                {
                    address: WETH.address,
                    decimals: WETH.decimals,
                },
                {
                    address: DAI.address,
                    decimals: DAI.decimals,
                },
                {
                    address: USDC.address,
                    decimals: USDC.decimals,
                },
                {
                    address: USDT.address,
                    decimals: USDT.decimals,
                },
            ],
        };
    }
}

/******************************************************************************/
