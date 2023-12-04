// pnpm test -- priceImpact.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    AddLiquiditySingleTokenInput,
    AddLiquidityKind,
    Address,
    Hex,
    PoolStateInput,
    ChainId,
    getPoolAddress,
    InputAmount,
    AddLiquidityUnbalancedInput,
    SwapKind,
} from '../src';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { PriceImpact } from '../src/entities/priceImpact';
import { PriceImpactAmount } from '../src/entities/priceImpactAmount';
import { parseEther } from 'viem';
import { SingleSwapInput } from '../src/entities/utils/doQuerySwap';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;
const poolId =
    '0x42ed016f826165c2e5976fe5bc3df540c5ad0af700000000000000000000058b'; // wstETH-rETH-sfrxETH
const wstETH = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0' as Address;
const sfrxETH = '0xac3e018457b222d93114458476f3e3416abbe38f' as Address;
const rETH = '0xae78736cd615f374d3085123a210448e74fc6393' as Address;

describe('price impact', () => {
    let poolStateInput: PoolStateInput;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolStateInput = await api.getPool(poolId);
    });

    describe('add liquidity single token', () => {
        let bptOut: InputAmount;
        let input: AddLiquiditySingleTokenInput;
        beforeAll(() => {
            bptOut = {
                rawAmount: 113693119026587239920n,
                decimals: 18,
                address: poolStateInput.address,
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
                poolStateInput,
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
            amountsIn = poolStateInput.tokens.map((t, i) => {
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
                poolStateInput,
            );
            const priceImpactSpot = PriceImpactAmount.fromDecimal(
                '0.001395038034686279', // from previous SDK/SOR
            );
            expect(priceImpactABA.decimal).closeTo(
                priceImpactSpot.decimal,
                1e-3, // 1 bps
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
                    tokenIn: {
                        address: wstETH,
                        decimals: 18,
                    },
                    tokenOut: {
                        address: rETH,
                        decimals: 18,
                    },
                    givenAmount: parseEther('100'),
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
                    tokenIn: {
                        address: wstETH,
                        decimals: 18,
                    },
                    tokenOut: {
                        address: rETH,
                        decimals: 18,
                    },
                    givenAmount: parseEther('100'),
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
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Hex): Promise<PoolStateInput> {
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
            type: 'PHANTOM_STABLE',
            tokens,
        };
    }
}

/******************************************************************************/
