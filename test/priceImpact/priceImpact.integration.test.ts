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
    RemoveLiquiditySingleTokenInput,
    RemoveLiquidityKind,
    RemoveLiquidityUnbalancedInput,
    PoolType,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';
import { PriceImpact } from '../../src/entities/priceImpact';
import { PriceImpactAmount } from '../../src/entities/priceImpactAmount';
import { parseEther } from 'viem';
import { SingleSwapInput } from '../../src/entities/utils/doSingleSwapQuery';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;
const poolId =
    '0x42ed016f826165c2e5976fe5bc3df540c5ad0af700000000000000000000058b'; // wstETH-rETH-sfrxETH
const wstETH = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0' as Address;
const sfrxETH = '0xac3e018457b222d93114458476f3e3416abbe38f' as Address;
const rETH = '0xae78736cd615f374d3085123a210448e74fc6393' as Address;

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
                tokenIn: wstETH,
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
                1e-3, // 10 bps
            );
        });
    });

    describe('swap', () => {
        let input: SingleSwapInput;
        describe('given in', () => {
            beforeAll(() => {
                input = {
                    poolId,
                    kind: SwapKind.GivenIn,
                    assetIn: wstETH,
                    assetOut: rETH,
                    amount: parseEther('100'),
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
                    poolId,
                    kind: SwapKind.GivenOut,
                    assetIn: wstETH,
                    assetOut: rETH,
                    amount: parseEther('100'),
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
        let input: RemoveLiquiditySingleTokenInput;
        beforeAll(() => {
            input = {
                chainId,
                rpcUrl,
                bptIn: {
                    rawAmount: parseEther('100'),
                    decimals: 18,
                    address: poolState.address,
                },
                tokenOut: wstETH,
                kind: RemoveLiquidityKind.SingleToken,
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

export class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: getPoolAddress(id) as Address,
                decimals: 18,
                index: 0,
            },
            {
                address: wstETH,
                decimals: 18,
                index: 1,
            },
            {
                address: sfrxETH,
                decimals: 18,
                index: 2,
            },
            {
                address: rETH,
                decimals: 18,
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
