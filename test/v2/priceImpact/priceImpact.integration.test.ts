// pnpm test -- priceImpact/priceImpact.integration.test.ts

import dotenv from 'dotenv';
dotenv.config();

import { parseEther, parseUnits } from 'viem';

import {
    AddLiquidityKind,
    AddLiquidityNestedInput,
    AddLiquiditySingleTokenInput,
    AddLiquidityUnbalancedInput,
    Address,
    calculateProportionalAmounts,
    ChainId,
    getPoolAddress,
    Hex,
    InputAmount,
    NestedPoolState,
    PoolState,
    PoolStateWithBalances,
    PoolType,
    PriceImpact,
    PriceImpactAmount,
    RemoveLiquidityKind,
    RemoveLiquiditySingleTokenExactInInput,
    RemoveLiquidityUnbalancedInput,
    RemoveLiquidityNestedSingleTokenInputV2,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';
import { HumanAmount } from '@/data';

const block = 18559730n;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET, undefined, block);
const chainId = ChainId.MAINNET;

// pool and tokens for add/remove liquidity
const wstETH_rETH_sfrxETH = POOLS[chainId].wstETH_rETH_sfrxETH;
const wstETH = TOKENS[chainId].wstETH;
const sfrxETH = TOKENS[chainId].sfrxETH;
const rETH = TOKENS[chainId].rETH;
const BAL_WETH = POOLS[chainId].BAL_WETH;
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

// nested pool and tokens
const DAI = TOKENS[chainId].DAI;
const USDC = TOKENS[chainId].USDC;
const USDT = TOKENS[chainId].USDT;
const BPT_3POOL = POOLS[chainId].BPT_3POOL;
const BPT_WETH_3POOL = POOLS[chainId].BPT_WETH_3POOL;

describe('price impact', () => {
    let poolState: PoolState;
    let nestedPoolState: NestedPoolState;
    let poolStateWithBalances: PoolStateWithBalances;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(wstETH_rETH_sfrxETH.id);
        nestedPoolState = await api.getNestedPool(BPT_WETH_3POOL.id);
        poolStateWithBalances = await api.fetchPoolStateWithBalances(
            BAL_WETH.id,
        );
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
            const priceImpactSpot =
                PriceImpactAmount.fromRawAmount(47564822560662355n); // from previous SDK
            expect(priceImpactABA.decimal).closeTo(
                priceImpactSpot.decimal,
                1e-3, // 1 bps
            );
        });
    });

    describe('add liquidity proportional', () => {
        let input: AddLiquidityUnbalancedInput;
        let tokenAmounts: InputAmount[];

        beforeAll(() => {
            // fetch proportional amounts required to produce the failing test
            ({ tokenAmounts } = calculateProportionalAmounts(
                poolStateWithBalances,
                {
                    rawAmount: parseEther('1'),
                    decimals: 18,
                    address: BAL.address,
                },
            ));

            input = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
                amountsIn: tokenAmounts,
            };
        });
        test('ABA close to zero', async () => {
            const priceImpactABA = await PriceImpact.addLiquidityUnbalanced(
                input,
                poolStateWithBalances,
            );
            expect(priceImpactABA.decimal).closeTo(
                0,
                1e-4, // 1 bps
            );
        });
        test('ABA close to zero with all deltas being 0', async () => {
            // force zero deltas and zero deltaBPS
            input.amountsIn = input.amountsIn.map((amountIn) => ({
                ...amountIn,
                rawAmount: 0n,
            }));

            const priceImpactABA = await PriceImpact.addLiquidityUnbalanced(
                input,
                poolStateWithBalances,
            );
            expect(priceImpactABA.decimal).closeTo(
                0,
                1e-4, // 1 bps
            );
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

    /**
     * FIXME: Test pending a reference value for comparison/validation, because
     * there is no corresponding method in previous SDK to validate the result.
     * We should be able to infer that it is correct because it follows the same
     * ABA approach as price impact for other actions (addLiquidity, swap, etc.)
     */
    describe('remove liquidity nested - single token', () => {
        let input: RemoveLiquidityNestedSingleTokenInputV2;
        beforeAll(() => {
            input = {
                chainId,
                rpcUrl,
                bptAmountIn: parseEther('1200'),
                tokenOut: WETH.address,
            };
        });
        test('ABA close to Spot Price', async () => {
            const priceImpactABA = await PriceImpact.removeLiquidityNested(
                input,
                nestedPoolState,
            );
            const priceImpactSpot = PriceImpactAmount.fromDecimal('0.0288');
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
            protocolVersion: 2,
        };
    }

    public async fetchPoolStateWithBalances(
        id: Hex,
    ): Promise<PoolStateWithBalances> {
        const tokens = [
            {
                symbol: 'BAL',
                name: 'Balancer',
                address: BAL.address as Address,
                decimals: 18,
                index: 0,
                balance: '33209420.429177837538000946' as HumanAmount,
            },
            {
                symbol: 'WETH',
                name: 'Wrapped Ether',
                address: WETH.address as Address,
                decimals: 18,
                index: 1,
                balance: '16591.168598583701574685' as HumanAmount,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.Weighted,
            tokens,
            totalShares: '14154229.749048855404944279' as HumanAmount,
            protocolVersion: 2,
        };
    }

    public async getNestedPool(poolId: Hex): Promise<NestedPoolState> {
        if (poolId !== BPT_WETH_3POOL.id) throw Error();
        return {
            protocolVersion: 2,
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
