// pnpm test v3/createPool/liquidityBootstrapping/createLiquidityBootstrappingFixedPrice.test.ts
import { parseEther, parseUnits, decodeFunctionData, zeroAddress } from 'viem';
import {
    ChainId,
    PoolType,
    CreatePoolLiquidityBootstrappingFixedPriceInput,
    fixedPriceLBPoolFactoryAbi_V3,
} from 'src';
import { CreatePoolLiquidityBootstrapping } from '@/entities/createPool/createPoolV3/liquidityBootstrapping/createLiquidityBootstrapping';
import { TOKENS } from 'test/lib/utils/addresses';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

const chainId = ChainId.SEPOLIA;
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

type LBPCommonParams = {
    name: string;
    symbol: string;
    owner: `0x${string}`;
    projectToken: `0x${string}`;
    reserveToken: `0x${string}`;
    startTime: bigint;
    endTime: bigint;
    blockProjectTokenSwapsIn: boolean;
};

type CreateFixedPriceLBPArgs = readonly [
    LBPCommonParams,
    bigint, // projectTokenRate
    bigint, // swapFeePercentage
    `0x${string}`, // salt
    `0x${string}`, // poolCreator
];

describe('CreatePoolLiquidityBootstrapping - FixedPrice Unit Tests', () => {
    const createPool = new CreatePoolLiquidityBootstrapping();
    let baseInput: CreatePoolLiquidityBootstrappingFixedPriceInput;

    beforeEach(() => {
        baseInput = {
            protocolVersion: 3,
            swapFeePercentage: parseUnits('0.01', 18),
            fixedPriceLbpParams: {
                owner: '0x0000000000000000000000000000000000000001',
                projectToken: BAL.address,
                reserveToken: WETH.address,
                startTimestamp: BigInt(Math.floor(Date.now() / 1000) + 86400),
                endTimestamp: BigInt(Math.floor(Date.now() / 1000) + 691200),
                projectTokenRate: parseEther('4'),
            },
            symbol: 'FP-LBP',
            chainId,
            poolType: PoolType.LiquidityBootstrappingFixedPrice,
        };
    });

    describe('buildCall - Factory Address', () => {
        test('should return FixedPriceLBPoolFactory address for FixedPrice pool type', () => {
            const result = createPool.buildCall(baseInput);
            const expectedFactory =
                AddressProvider.FixedPriceLBPoolFactory(chainId);
            expect(result.to).toBe(expectedFactory);
        });

        test('should return different factory address than standard LBP factory', () => {
            const result = createPool.buildCall(baseInput);
            const standardFactory = AddressProvider.LBPoolFactory(chainId);
            expect(result.to).not.toBe(standardFactory);
        });
    });

    describe('buildCall - Call Data Encoding', () => {
        test('should encode function call with correct function name', () => {
            const result = createPool.buildCall(baseInput);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });
            expect(decoded.functionName).toBe('create');
        });

        test('should encode all required parameters correctly', () => {
            const result = createPool.buildCall(baseInput);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            expect(decoded.args).toBeDefined();
            const [
                lbpCommonParams,
                projectTokenRate,
                swapFeePercentage,
                salt,
                poolCreator,
            ] = decoded.args as CreateFixedPriceLBPArgs;

            // Verify LBPCommonParams structure
            expect(lbpCommonParams.name).toBe(baseInput.symbol); // Uses symbol when name not provided
            expect(lbpCommonParams.symbol).toBe(baseInput.symbol);
            expect(lbpCommonParams.owner.toLowerCase()).toBe(
                baseInput.fixedPriceLbpParams.owner.toLowerCase(),
            );
            expect(lbpCommonParams.projectToken.toLowerCase()).toBe(
                baseInput.fixedPriceLbpParams.projectToken.toLowerCase(),
            );
            expect(lbpCommonParams.reserveToken.toLowerCase()).toBe(
                baseInput.fixedPriceLbpParams.reserveToken.toLowerCase(),
            );
            expect(lbpCommonParams.startTime).toBe(
                baseInput.fixedPriceLbpParams.startTimestamp,
            );
            expect(lbpCommonParams.endTime).toBe(
                baseInput.fixedPriceLbpParams.endTimestamp,
            );
            expect(lbpCommonParams.blockProjectTokenSwapsIn).toBe(true); // Always true for fixed price

            // Verify other parameters
            expect(projectTokenRate).toBe(
                baseInput.fixedPriceLbpParams.projectTokenRate,
            );
            expect(swapFeePercentage).toBe(baseInput.swapFeePercentage);
            expect(salt).toBeDefined();
            expect(poolCreator.toLowerCase()).toBe(zeroAddress.toLowerCase()); // Defaults to zeroAddress when not provided
        });

        test('should use provided name when available', () => {
            const inputWithName = {
                ...baseInput,
                name: 'Fixed Price Liquidity Bootstrapping Pool',
            };
            const result = createPool.buildCall(inputWithName);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            const [lbpCommonParams] = decoded.args as CreateFixedPriceLBPArgs;
            expect(lbpCommonParams.name).toBe(inputWithName.name);
        });

        test('should use symbol as name when name is not provided', () => {
            const result = createPool.buildCall(baseInput);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            const [lbpCommonParams] = decoded.args as CreateFixedPriceLBPArgs;
            expect(lbpCommonParams.name).toBe(baseInput.symbol);
        });

        test('should use provided salt when available', () => {
            const customSalt =
                '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            const inputWithSalt = {
                ...baseInput,
                salt: customSalt as `0x${string}`,
            };
            const result = createPool.buildCall(inputWithSalt);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            const [, , , salt] = decoded.args as CreateFixedPriceLBPArgs;
            expect(salt).toBe(customSalt);
        });

        test('should generate random salt when not provided', () => {
            const result = createPool.buildCall(baseInput);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            const [, , , salt] = decoded.args as CreateFixedPriceLBPArgs;
            expect(salt).toBeDefined();
            expect(salt).toMatch(/^0x[a-fA-F0-9]{64}$/); // Valid bytes32 hex string
        });

        test('should use provided poolCreator when available', () => {
            const customCreator = '0x1111111111111111111111111111111111111111';
            const inputWithCreator = {
                ...baseInput,
                poolCreator: customCreator as `0x${string}`,
            };
            const result = createPool.buildCall(inputWithCreator);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            const [, , , , poolCreator] =
                decoded.args as CreateFixedPriceLBPArgs;
            expect(poolCreator.toLowerCase()).toBe(customCreator.toLowerCase());
        });

        test('should default poolCreator to zeroAddress when not provided', () => {
            const result = createPool.buildCall(baseInput);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            const [, , , , poolCreator] =
                decoded.args as CreateFixedPriceLBPArgs;
            expect(poolCreator.toLowerCase()).toBe(zeroAddress.toLowerCase());
        });
    });

    describe('buildCall - Fixed Price Specific Behavior', () => {
        test('should always set blockProjectTokenSwapsIn to true', () => {
            // Even if we try to set it differently (though it's not in the input type),
            // the encoding should always use true
            const result = createPool.buildCall(baseInput);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            const [lbpCommonParams] = decoded.args as CreateFixedPriceLBPArgs;
            expect(lbpCommonParams.blockProjectTokenSwapsIn).toBe(true);
        });

        test('should encode projectTokenRate correctly', () => {
            const testRates = [
                parseEther('1'), // 1:1
                parseEther('0.5'), // 0.5:1
                parseEther('10'), // 10:1
                parseEther('0.0001'), // Very small rate
                parseEther('1000000'), // Very large rate
            ];

            testRates.forEach((rate) => {
                const input = {
                    ...baseInput,
                    fixedPriceLbpParams: {
                        ...baseInput.fixedPriceLbpParams,
                        projectTokenRate: rate,
                    },
                };
                const result = createPool.buildCall(input);
                const decoded = decodeFunctionData({
                    abi: fixedPriceLBPoolFactoryAbi_V3,
                    data: result.callData,
                });

                const [, projectTokenRate] =
                    decoded.args as CreateFixedPriceLBPArgs;
                expect(projectTokenRate).toBe(rate);
            });
        });
    });

    describe('buildCall - Edge Cases', () => {
        test('should handle zero swap fee percentage', () => {
            const inputWithZeroFee = {
                ...baseInput,
                swapFeePercentage: 0n,
            };
            const result = createPool.buildCall(inputWithZeroFee);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            const [, , swapFeePercentage] =
                decoded.args as CreateFixedPriceLBPArgs;
            expect(swapFeePercentage).toBe(0n);
        });

        test('should handle maximum swap fee percentage (10%)', () => {
            const inputWithMaxFee = {
                ...baseInput,
                swapFeePercentage: parseUnits('0.10', 18),
            };
            const result = createPool.buildCall(inputWithMaxFee);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            const [, , swapFeePercentage] =
                decoded.args as CreateFixedPriceLBPArgs;
            expect(swapFeePercentage).toBe(parseUnits('0.10', 18));
        });

        test('should handle different chain IDs', () => {
            const chainIds = [
                ChainId.MAINNET,
                ChainId.SEPOLIA,
                ChainId.ARBITRUM_ONE,
            ] as const;
            chainIds.forEach((testChainId) => {
                const input = {
                    ...baseInput,
                    chainId: testChainId,
                };
                const result = createPool.buildCall(input);
                const expectedFactory =
                    AddressProvider.FixedPriceLBPoolFactory(testChainId);
                expect(result.to).toBe(expectedFactory);
            });
        });

        test('should handle very large timestamps', () => {
            const inputWithLargeTimestamps = {
                ...baseInput,
                fixedPriceLbpParams: {
                    ...baseInput.fixedPriceLbpParams,
                    startTimestamp: BigInt('9999999999'),
                    endTimestamp: BigInt('99999999999'),
                },
            };
            const result = createPool.buildCall(inputWithLargeTimestamps);
            const decoded = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result.callData,
            });

            const [lbpCommonParams] = decoded.args as CreateFixedPriceLBPArgs;
            expect(lbpCommonParams.startTime).toBe(BigInt('9999999999'));
            expect(lbpCommonParams.endTime).toBe(BigInt('99999999999'));
        });
    });

    describe('buildCall - Output Structure', () => {
        test('should return object with callData and to properties', () => {
            const result = createPool.buildCall(baseInput);
            expect(result).toHaveProperty('callData');
            expect(result).toHaveProperty('to');
            expect(typeof result.callData).toBe('string');
            expect(result.callData).toMatch(/^0x[a-fA-F0-9]+$/);
            expect(typeof result.to).toBe('string');
            expect(result.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
        });

        test('should produce valid hex callData', () => {
            const result = createPool.buildCall(baseInput);
            expect(result.callData.length).toBeGreaterThan(10); // At least function selector + some data
            expect(() => {
                decodeFunctionData({
                    abi: fixedPriceLBPoolFactoryAbi_V3,
                    data: result.callData,
                });
            }).not.toThrow();
        });
    });

    describe('buildCall - Consistency', () => {
        test('should produce same callData for same input', () => {
            const inputWithSalt = {
                ...baseInput,
                salt: `0x${'1'.repeat(64)}` as `0x${string}`,
            };
            const result1 = createPool.buildCall(inputWithSalt);
            const result2 = createPool.buildCall(inputWithSalt);
            // With same salt, callData should be identical
            expect(result1.callData).toBe(result2.callData);
        });

        test('should produce different callData when salt differs', () => {
            const input1 = {
                ...baseInput,
                salt: `0x${'1'.repeat(64)}` as `0x${string}`,
            };
            const input2 = {
                ...baseInput,
                salt: `0x${'2'.repeat(64)}` as `0x${string}`,
            };

            const result1 = createPool.buildCall(input1);
            const result2 = createPool.buildCall(input2);

            expect(result1.callData).not.toBe(result2.callData);
        });

        test('should produce consistent decoded parameters for same input (excluding salt)', () => {
            const result1 = createPool.buildCall(baseInput);
            const result2 = createPool.buildCall(baseInput);
            // Note: If salt is auto-generated, these will differ
            // So we decode and compare everything except salt
            const decoded1 = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result1.callData,
            });
            const decoded2 = decodeFunctionData({
                abi: fixedPriceLBPoolFactoryAbi_V3,
                data: result2.callData,
            });

            const [params1, rate1, fee1, , creator1] =
                decoded1.args as CreateFixedPriceLBPArgs;
            const [params2, rate2, fee2, , creator2] =
                decoded2.args as CreateFixedPriceLBPArgs;

            expect(params1).toEqual(params2);
            expect(rate1).toBe(rate2);
            expect(fee1).toBe(fee2);
            expect(creator1).toBe(creator2);
        });
    });
});
