// pnpm test addLiquidityUnbalancedViaSwap.test.ts
import { Address, maxUint256, maxUint48, parseUnits, zeroAddress } from 'viem';
import { ChainId, PoolState, Slippage } from '@/index';
import {
    AddLiquidityUnbalancedViaSwapV3,
    AddLiquidityUnbalancedViaSwapQueryOutput,
    AddLiquidityUnbalancedViaSwapInput,
} from '@/entities/addLiquidityUnbalancedViaSwap';
import { validateAddLiquidityUnbalancedViaSwapInput } from '@/entities/addLiquidityUnbalancedViaSwap/validateInputs';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { Permit2Batch } from '@/entities/permit2Helper';
import { TOKENS } from 'test/lib/utils/addresses';

const chainId = ChainId.MAINNET;

const AAVE = TOKENS[chainId].AAVE;
const WETH = TOKENS[chainId].WETH;
const DAI = TOKENS[chainId].DAI;

// Mock pool state with 2 tokens (AAVE/WETH)
const mockPoolState: PoolState = {
    id: '0x9d1fcf346ea1b073de4d5834e25572cc6ad71f4d' as Address,
    address: '0x9d1fcf346ea1b073de4d5834e25572cc6ad71f4d' as Address,
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

// Mock pool state with 3 tokens (for testing validation)
const mockPoolStateWith3Tokens: PoolState = {
    id: '0x9d1fcf346ea1b073de4d5834e25572cc6ad71f4d' as Address,
    address: '0x9d1fcf346ea1b073de4d5834e25572cc6ad71f4d' as Address,
    type: 'WEIGHTED',
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
        {
            address: DAI.address,
            decimals: DAI.decimals,
            index: 2,
        },
    ],
};

describe('AddLiquidityUnbalancedViaSwap', () => {
    describe('input validation', () => {
        describe('pool token count validation', () => {
            test('throws error when pool has more than 2 tokens', () => {
                const input: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl: 'http://localhost:8545',
                    expectedAdjustableAmountIn: {
                        rawAmount: parseUnits('100', AAVE.decimals),
                        decimals: AAVE.decimals,
                        address: AAVE.address,
                    },
                };

                expect(() =>
                    validateAddLiquidityUnbalancedViaSwapInput(
                        input,
                        mockPoolStateWith3Tokens,
                    ),
                ).toThrowError('Pool should have exactly 2 tokens');
            });
        });

        describe('expectedAdjustableAmountIn validation', () => {
            test('throws error when expectedAdjustableAmountIn is zero', () => {
                const input: AddLiquidityUnbalancedViaSwapInput = {
                    chainId,
                    rpcUrl: 'http://localhost:8545',
                    expectedAdjustableAmountIn: {
                        rawAmount: 0n,
                        decimals: AAVE.decimals,
                        address: AAVE.address,
                    },
                };

                expect(() =>
                    validateAddLiquidityUnbalancedViaSwapInput(
                        input,
                        mockPoolState,
                    ),
                ).toThrowError(
                    'expectedAdjustableAmountIn should be greater than zero',
                );
            });
        });
    });

    describe('buildCall', () => {
        let addLiquidityUnbalancedViaSwap: AddLiquidityUnbalancedViaSwapV3;
        let mockQueryOutput: AddLiquidityUnbalancedViaSwapQueryOutput;

        beforeAll(() => {
            addLiquidityUnbalancedViaSwap =
                new AddLiquidityUnbalancedViaSwapV3();

            const bptToken = new Token(chainId, mockPoolState.address, 18);
            const exactToken = new Token(chainId, WETH.address, WETH.decimals);
            const adjustableToken = new Token(
                chainId,
                AAVE.address,
                AAVE.decimals,
            );

            mockQueryOutput = {
                pool: mockPoolState.address,
                bptOut: TokenAmount.fromRawAmount(
                    bptToken,
                    parseUnits('100', 18),
                ),
                exactAmountIn: TokenAmount.fromRawAmount(exactToken, 0n),
                expectedAdjustableAmountIn: TokenAmount.fromRawAmount(
                    adjustableToken,
                    parseUnits('50', AAVE.decimals),
                ),
                chainId,
                protocolVersion: 3,
                to: AddressProvider.Router(chainId),
                addLiquidityUserData: '0x',
                swapUserData: '0x',
            };
        });

        describe('callData encoding', () => {
            test('encodes callData with correct function selector', () => {
                const buildCallInput = {
                    ...mockQueryOutput,
                    slippage: Slippage.fromPercentage('1'),
                    deadline: maxUint256,
                };

                const result =
                    addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);

                // Function selector for addLiquidityUnbalanced
                expect(result.callData).toBe(
                    '0xaba40fa70000000000000000000000009d1fcf346ea1b073de4d5834e25572cc6ad71f4dffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000056bc75e2d63100000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002bcd40a70853a000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                );
            });
        });

        describe('slippage application', () => {
            test('applies slippage to expectedAdjustableAmountIn', () => {
                const slippage = Slippage.fromPercentage('1'); // 1%
                const buildCallInput = {
                    ...mockQueryOutput,
                    slippage,
                    deadline: maxUint256,
                };

                const result =
                    addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);

                // Verify slippage calculation: expectedAdjustableAmountIn * (1 + slippage)
                const maxAdjustableAmount = slippage.applyTo(
                    mockQueryOutput.expectedAdjustableAmountIn.amount,
                );
                expect(result.maxAdjustableAmountIn.amount).toBe(
                    maxAdjustableAmount,
                );
            });
        });

        describe('value calculation', () => {
            test('returns adjustable WETH amount as value when wethIsEth is true and expectedAdjustableAmountIn is WETH', () => {
                const exactToken = new Token(
                    chainId,
                    AAVE.address,
                    AAVE.decimals,
                );
                const adjustableToken = new Token(
                    chainId,
                    WETH.address,
                    WETH.decimals,
                );
                const bptToken = new Token(chainId, mockPoolState.address, 18);

                const wethAmount = parseUnits('1', WETH.decimals);
                const queryOutputWithWeth: AddLiquidityUnbalancedViaSwapQueryOutput =
                    {
                        ...mockQueryOutput,
                        exactAmountIn: TokenAmount.fromRawAmount(
                            exactToken,
                            0n,
                        ),
                        expectedAdjustableAmountIn: TokenAmount.fromRawAmount(
                            adjustableToken,
                            wethAmount,
                        ),
                        bptOut: TokenAmount.fromRawAmount(
                            bptToken,
                            parseUnits('100', 18),
                        ),
                    };

                const slippage = Slippage.fromPercentage('1');
                const buildCallInput = {
                    ...queryOutputWithWeth,
                    slippage,
                    deadline: maxUint256,
                    wethIsEth: true,
                };

                const result =
                    addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);

                const maxWethAmount = slippage.applyTo(wethAmount);

                expect(result.value).toBe(maxWethAmount);
            });
        });

        describe('contract address', () => {
            test('returns proper contract address', () => {
                const buildCallInput = {
                    ...mockQueryOutput,
                    slippage: Slippage.fromPercentage('1'),
                    deadline: maxUint256,
                };

                const result =
                    addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);

                expect(result.to).toEqual(
                    AddressProvider.UnbalancedAddViaSwapRouter(
                        buildCallInput.chainId,
                    ),
                );
            });
        });
    });

    describe('buildCallWithPermit2', () => {
        let addLiquidityUnbalancedViaSwap: AddLiquidityUnbalancedViaSwapV3;
        let mockQueryOutput: AddLiquidityUnbalancedViaSwapQueryOutput;

        beforeAll(() => {
            addLiquidityUnbalancedViaSwap =
                new AddLiquidityUnbalancedViaSwapV3();

            const bptToken = new Token(chainId, mockPoolState.address, 18);
            const exactToken = new Token(chainId, WETH.address, WETH.decimals);
            const adjustableToken = new Token(
                chainId,
                AAVE.address,
                AAVE.decimals,
            );

            mockQueryOutput = {
                pool: mockPoolState.address,
                bptOut: TokenAmount.fromRawAmount(
                    bptToken,
                    parseUnits('100', 18),
                ),
                exactAmountIn: TokenAmount.fromRawAmount(exactToken, 0n),
                expectedAdjustableAmountIn: TokenAmount.fromRawAmount(
                    adjustableToken,
                    parseUnits('50', AAVE.decimals),
                ),
                chainId,
                protocolVersion: 3,
                to: AddressProvider.Router(chainId),
                addLiquidityUserData: '0x',
                swapUserData: '0x',
            };
        });

        test('encodes permitBatchAndCall function', () => {
            const buildCallInput = {
                ...mockQueryOutput,
                slippage: Slippage.fromPercentage('1'),
                deadline: maxUint256,
            };

            const mockPermit2: {
                batch: Permit2Batch;
                signature: `0x${string}`;
            } = {
                batch: {
                    details: [
                        {
                            token: AAVE.address,
                            amount: parseUnits('50', AAVE.decimals),
                            expiration: Number(maxUint48),
                            nonce: 0,
                        },
                    ],
                    spender: zeroAddress,
                    sigDeadline: maxUint256,
                },
                signature: '0x1234567890abcdef' as `0x${string}`,
            };

            const result = addLiquidityUnbalancedViaSwap.buildCallWithPermit2(
                buildCallInput,
                mockPermit2,
            );

            // Should have different callData than buildCall (wrapped in permitBatchAndCall)
            const regularResult =
                addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);
            expect(result.callData).not.toBe(regularResult.callData);
            expect(result.callData.length).toBeGreaterThan(
                regularResult.callData.length,
            );
        });

        test('preserves other output fields from buildCall', () => {
            const buildCallInput = {
                ...mockQueryOutput,
                slippage: Slippage.fromPercentage('1'),
                deadline: maxUint256,
            };

            const mockPermit2: {
                batch: Permit2Batch;
                signature: `0x${string}`;
            } = {
                batch: {
                    details: [
                        {
                            token: AAVE.address,
                            amount: parseUnits('50', AAVE.decimals),
                            expiration: Number(maxUint48),
                            nonce: 0,
                        },
                    ],
                    spender: zeroAddress,
                    sigDeadline: maxUint256,
                },
                signature: '0x1234567890abcdef' as `0x${string}`,
            };

            const result = addLiquidityUnbalancedViaSwap.buildCallWithPermit2(
                buildCallInput,
                mockPermit2,
            );
            const regularResult =
                addLiquidityUnbalancedViaSwap.buildCall(buildCallInput);

            // These fields should be the same
            expect(result.to).toBe(regularResult.to);
            expect(result.value).toBe(regularResult.value);
            expect(result.bptOut.amount).toBe(regularResult.bptOut.amount);
            expect(result.expectedAdjustableAmountIn).toEqual(
                regularResult.expectedAdjustableAmountIn,
            );
            expect(result.expectedAdjustableAmountIn).toEqual(
                regularResult.expectedAdjustableAmountIn,
            );
        });

        test('applies slippage correctly with permit2', () => {
            const slippage = Slippage.fromPercentage('5'); // 5%
            const buildCallInput = {
                ...mockQueryOutput,
                slippage,
                deadline: maxUint256,
            };

            const mockPermit2: {
                batch: Permit2Batch;
                signature: `0x${string}`;
            } = {
                batch: {
                    details: [
                        {
                            token: AAVE.address,
                            amount: parseUnits('50', AAVE.decimals),
                            expiration: Number(maxUint48),
                            nonce: 0,
                        },
                    ],
                    spender: zeroAddress,
                    sigDeadline: maxUint256,
                },
                signature: '0x1234567890abcdef' as `0x${string}`,
            };

            const result = addLiquidityUnbalancedViaSwap.buildCallWithPermit2(
                buildCallInput,
                mockPermit2,
            );

            // Verify slippage calculation: expectedAdjustableAmountIn * (1 + slippage)
            const maxAdjustableAmount = slippage.applyTo(
                mockQueryOutput.expectedAdjustableAmountIn.amount,
            );
            expect(result.maxAdjustableAmountIn.amount).toBe(
                maxAdjustableAmount,
            );
        });
    });
});
