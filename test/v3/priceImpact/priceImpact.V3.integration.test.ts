// pnpm test -- priceImpact/priceImpact.V3.integration.test.ts

import dotenv from 'dotenv';
dotenv.config();

import { Address, parseUnits } from 'viem';
import {
    AddLiquidityBoostedUnbalancedInput,
    AddLiquidityKind,
    AddLiquidityNestedInput,
    ChainId,
    PriceImpact,
    PriceImpactAmount,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { TOKENS } from 'test/lib/utils/addresses';
import { boostedPool_USDC_USDT } from 'test/mockData/boostedPool';
import { partialBoostedPool_USDT_stataDAI } from 'test/mockData/partialBoostedPool';
import { nestedWithBoostedPool } from 'test/mockData/nestedPool';

const chainId = ChainId.SEPOLIA;
const USDC = TOKENS[chainId].USDC_AAVE;
const USDT = TOKENS[chainId].USDT_AAVE;
const DAI = TOKENS[chainId].DAI_AAVE;
const WETH = TOKENS[chainId].WETH;

describe('PriceImpact V3', () => {
    let rpcUrl: string;
    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA));
    });
    /**
     * FIXME: Test pending a reference value for comparison/validation, because
     * there is no corresponding method in previous SDK to validate the result.
     * We should be able to infer that it is correct because it follows the same
     * ABA approach as price impact for other actions (addLiquidity, swap, etc.)
     */
    describe('Full Boosted Pool Boosted Pool AddLiquidity', () => {
        test('Close to proportional', async () => {
            const addLiquidityInput: AddLiquidityBoostedUnbalancedInput = {
                chainId,
                rpcUrl,
                amountsIn: [
                    {
                        rawAmount: 1000000n,
                        decimals: 6,
                        address: USDC.address as Address,
                    },
                    {
                        rawAmount: 1000000n,
                        decimals: 6,
                        address: USDT.address as Address,
                    },
                ],
                kind: AddLiquidityKind.Unbalanced,
                userData: '0x',
            };
            const priceImpactABA =
                await PriceImpact.addLiquidityUnbalancedBoosted(
                    addLiquidityInput,
                    boostedPool_USDC_USDT,
                );
            const priceImpactSpot = PriceImpactAmount.fromDecimal('0.0000555');
            expect(priceImpactABA.decimal).eq(priceImpactSpot.decimal);
        });

        test('Unbalanced', async () => {
            const addLiquidityInput: AddLiquidityBoostedUnbalancedInput = {
                chainId,
                rpcUrl,
                amountsIn: [
                    {
                        rawAmount: 10000000000n,
                        decimals: 6,
                        address: USDC.address as Address,
                    },
                    {
                        rawAmount: 1000000n,
                        decimals: 6,
                        address: USDT.address as Address,
                    },
                ],
                kind: AddLiquidityKind.Unbalanced,
                userData: '0x',
            };
            const priceImpactABA =
                await PriceImpact.addLiquidityUnbalancedBoosted(
                    addLiquidityInput,
                    boostedPool_USDC_USDT,
                );
            const priceImpactSpot =
                PriceImpactAmount.fromDecimal('0.0005708172');
            expect(priceImpactABA.decimal).eq(priceImpactSpot.decimal);
        });

        test('Single token input', async () => {
            const addLiquidityInput: AddLiquidityBoostedUnbalancedInput = {
                chainId,
                rpcUrl,
                amountsIn: [
                    {
                        rawAmount: 1000000n,
                        decimals: 6,
                        address: USDT.address as Address,
                    },
                ],
                kind: AddLiquidityKind.Unbalanced,
                userData: '0x',
            };
            const priceImpactABA =
                await PriceImpact.addLiquidityUnbalancedBoosted(
                    addLiquidityInput,
                    boostedPool_USDC_USDT,
                );
            const priceImpactSpot = PriceImpactAmount.fromDecimal('0.0004755');
            expect(priceImpactABA.decimal).eq(priceImpactSpot.decimal);
        });
    });

    describe('Partial Boosted Pool Boosted Pool AddLiquidity', () => {
        test('Close to proportional', async () => {
            const addLiquidityInput: AddLiquidityBoostedUnbalancedInput = {
                chainId,
                rpcUrl,
                amountsIn: [
                    {
                        rawAmount: 1000000n,
                        decimals: USDT.decimals,
                        address: USDT.address as Address,
                    },
                    {
                        rawAmount: 1000000000000000000n,
                        decimals: DAI.decimals,
                        address: DAI.address as Address,
                    },
                ],
                kind: AddLiquidityKind.Unbalanced,
                userData: '0x',
            };
            const priceImpactABA =
                await PriceImpact.addLiquidityUnbalancedBoosted(
                    addLiquidityInput,
                    partialBoostedPool_USDT_stataDAI,
                );
            const priceImpactSpot = PriceImpactAmount.fromDecimal('0.0000065');
            expect(priceImpactABA.decimal).eq(priceImpactSpot.decimal);
        });

        test('Unbalanced', async () => {
            const addLiquidityInput: AddLiquidityBoostedUnbalancedInput = {
                chainId,
                rpcUrl,
                amountsIn: [
                    {
                        rawAmount: 4000000n,
                        decimals: USDT.decimals,
                        address: USDT.address as Address,
                    },
                    {
                        rawAmount: 1000000000000000000n,
                        decimals: DAI.decimals,
                        address: DAI.address as Address,
                    },
                ],
                kind: AddLiquidityKind.Unbalanced,
                userData: '0x',
            };
            const priceImpactABA =
                await PriceImpact.addLiquidityUnbalancedBoosted(
                    addLiquidityInput,
                    partialBoostedPool_USDT_stataDAI,
                );
            const priceImpactSpot = PriceImpactAmount.fromDecimal('0.0056435');
            expect(priceImpactABA.decimal).eq(priceImpactSpot.decimal);
        });
    });

    describe('Nested pool', () => {
        test('Close to proportional', async () => {
            const addLiquidityInput: AddLiquidityNestedInput = {
                amountsIn: [
                    {
                        address: WETH.address,
                        rawAmount: parseUnits('0.001', WETH.decimals),
                        decimals: WETH.decimals,
                    },
                    {
                        address: USDC.address,
                        rawAmount: parseUnits('2', USDC.decimals),
                        decimals: USDC.decimals,
                    },
                ],
                chainId,
                rpcUrl,
            };
            const priceImpactABA = await PriceImpact.addLiquidityNested(
                addLiquidityInput,
                nestedWithBoostedPool,
            );
            const priceImpactSpot =
                PriceImpactAmount.fromDecimal('0.0018658560496355');
            expect(priceImpactABA.decimal).eq(priceImpactSpot.decimal);
        });
    });
});
