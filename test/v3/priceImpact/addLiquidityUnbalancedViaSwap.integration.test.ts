// pnpm test -- addLiquidityUnbalancedViaSwap.integration.test.ts

import { config } from 'dotenv';
config();

import { Address, parseUnits } from 'viem';

import {
    AddLiquidityUnbalancedViaSwapInput,
    AddLiquidityUnbalancedViaSwapV3,
    ChainId,
    PoolState,
    PoolTokenWithBalance,
    PriceImpact,
    PriceImpactAmount,
    RemoveLiquidity,
    RemoveLiquidityKind,
    SDKError,
    getPoolStateWithBalancesV3,
    isSameAddress,
} from '@/index';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { POOLS, TOKENS } from '../../lib/utils';

const chainId = ChainId.MAINNET;
const poolId: Address = POOLS[chainId].AAVE_WETH.id;

const AAVE = TOKENS[chainId].AAVE;
const WETH = TOKENS[chainId].WETH;

class MockApi {
    async getPool(id: Address): Promise<PoolState> {
        if (isSameAddress(id, poolId)) {
            return {
                id,
                address: id,
                type: 'RECLAMM',
                protocolVersion: 3,
                tokens: [
                    {
                        address: AAVE.address,
                        decimals: AAVE.decimals,
                        index: 0,
                    },
                    {
                        address: WETH.address,
                        decimals: WETH.decimals,
                        index: 1,
                    },
                ],
            };
        }

        throw new Error(`Unknown test poolId: ${id}`);
    }
}

describe('PriceImpact addLiquidityUnbalancedViaSwap', () => {
    let rpcUrl: string;
    let poolState: PoolState;
    let testAddress: Address;

    beforeAll(async () => {
        const api = new MockApi();
        poolState = await api.getPool(poolId);

        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS[ChainId[chainId]],
            undefined,
            24326402n,
        ));

        testAddress = '0x0000000000000000000000000000000000000001' as Address;
    });

    describe('AAVE-adjustable', () => {
        const FRACTIONS = [
            { label: '0.1%', num: 1n, den: 1000n },
            { label: '1%', num: 1n, den: 100n },
            { label: '10%', num: 1n, den: 10n },
        ] as const;

        let expectedAdjustableTokenBalanceRaw: bigint;

        beforeAll(async () => {
            const poolStateWithBalances = await getPoolStateWithBalancesV3(
                poolState,
                chainId,
                rpcUrl,
            );
            const aaveToken = poolStateWithBalances.tokens.find((t) =>
                isSameAddress(t.address, AAVE.address),
            ) as PoolTokenWithBalance;

            expectedAdjustableTokenBalanceRaw = parseUnits(
                aaveToken.balance,
                aaveToken.decimals,
            );
        });

        for (const { label, num, den } of FRACTIONS) {
            test(`price impact at ${label} of pool AAVE balance`, async () => {
                const budget = (expectedAdjustableTokenBalanceRaw * num) / den;

                const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    expectedAdjustableAmountIn: {
                        rawAmount: budget,
                        decimals: AAVE.decimals,
                        address: AAVE.address,
                    },
                    addLiquidityUserData: '0x',
                    sender: testAddress,
                };

                const priceImpact =
                    await PriceImpact.addLiquidityUnbalancedViaSwap(
                        addLiquidityInput,
                        poolState,
                    );

                expect(priceImpact.amount).toBeGreaterThanOrEqual(0n);
                expect(priceImpact.percentage).toBeGreaterThan(0);

                if (label === '1%') {
                    const priceImpactSpot = PriceImpactAmount.fromDecimal(
                        '0.00163134016896679',
                    );
                    expect(priceImpact.decimal).eq(priceImpactSpot.decimal);
                }
            });
        }

        test('monotonicity: PI(0.1%) < PI(1%) < PI(10%)', async () => {
            const priceImpacts: number[] = [];
            for (const { num, den } of FRACTIONS) {
                const budget = (expectedAdjustableTokenBalanceRaw * num) / den;
                const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl,
                    expectedAdjustableAmountIn: {
                        rawAmount: budget,
                        decimals: AAVE.decimals,
                        address: AAVE.address,
                    },
                    addLiquidityUserData: '0x',
                    sender: testAddress,
                };
                const priceImpact =
                    await PriceImpact.addLiquidityUnbalancedViaSwap(
                        addLiquidityInput,
                        poolState,
                    );
                priceImpacts.push(priceImpact.percentage);
            }
            expect(priceImpacts[0]).toBeLessThan(priceImpacts[1]);
            expect(priceImpacts[1]).toBeLessThan(priceImpacts[2]);
        });
    });

    test('WETH-adjustable smoke at 0.1% of pool WETH balance', async () => {
        const poolStateWithBalances = await getPoolStateWithBalancesV3(
            poolState,
            chainId,
            rpcUrl,
        );
        const wethToken = poolStateWithBalances.tokens.find((t) =>
            isSameAddress(t.address, WETH.address),
        ) as PoolTokenWithBalance;
        const wethBalanceRaw = parseUnits(
            wethToken.balance,
            wethToken.decimals,
        );
        const budget = wethBalanceRaw / 1000n;

        const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
            chainId,
            rpcUrl,
            expectedAdjustableAmountIn: {
                rawAmount: budget,
                decimals: WETH.decimals,
                address: WETH.address,
            },
            addLiquidityUserData: '0x',
            sender: testAddress,
        };

        const priceImpact = await PriceImpact.addLiquidityUnbalancedViaSwap(
            addLiquidityInput,
            poolState,
        );

        expect(priceImpact.amount).toBeGreaterThanOrEqual(0n);
        expect(priceImpact.percentage).toBeGreaterThan(0);
    });

    test('absurd budget throws SDKError', async () => {
        const addLiquidityInput: AddLiquidityUnbalancedViaSwapInput = {
            chainId,
            rpcUrl,
            expectedAdjustableAmountIn: {
                rawAmount: parseUnits('1000000000', AAVE.decimals),
                decimals: AAVE.decimals,
                address: AAVE.address,
            },
            addLiquidityUserData: '0x',
            sender: testAddress,
        };

        try {
            await PriceImpact.addLiquidityUnbalancedViaSwap(
                addLiquidityInput,
                poolState,
            );
            expect.fail('Expected SDKError');
        } catch (err) {
            expect(err).toBeInstanceOf(SDKError);
            expect(err).toMatchObject({
                name: 'Price Impact',
                action: 'Add Liquidity Unbalanced Via Swap',
            });
        }
    });
});
