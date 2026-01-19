// pnpm test createPool/liquidityBootstrapping/liquidityBootstrappingFixedPrice.validation.test.ts

import { parseEther, parseUnits } from 'viem';
import {
    ChainId,
    PoolType,
    CreatePool,
    CreatePoolLiquidityBootstrappingFixedPriceInput,
    inputValidationError,
} from 'src';
import { TOKENS } from 'test/lib/utils/addresses';
import { zeroAddress } from 'viem';

const chainId = ChainId.SEPOLIA;
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('LiquidityBootstrappingFixedPrice Input Validation', () => {
    const createPool = new CreatePool();
    let createPoolInput: CreatePoolLiquidityBootstrappingFixedPriceInput;

    beforeAll(() => {
        // Start with a valid input and modify individual params to expect errors
        createPoolInput = {
            protocolVersion: 3,
            swapFeePercentage: parseUnits('0.01', 18),
            fixedPriceLbpParams: {
                owner: '0x0000000000000000000000000000000000000001',
                projectToken: BAL.address,
                reserveToken: WETH.address,
                startTimestamp: BigInt(Math.floor(Date.now() / 1000) + 86400), // now + 1 day
                endTimestamp: BigInt(Math.floor(Date.now() / 1000) + 691200), // now + 8 days
                projectTokenRate: parseEther('4'), // 1 BAL = 4 WETH
            },
            symbol: 'FP-LBP',
            chainId,
            poolType: PoolType.LiquidityBootstrappingFixedPrice,
        };
    });

    test('Owner address cannot be zero', () => {
        const invalidInput = {
            ...createPoolInput,
            fixedPriceLbpParams: {
                ...createPoolInput.fixedPriceLbpParams,
                owner: zeroAddress,
            },
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError('Create Pool', 'Owner address cannot be zero'),
        );
    });

    test('Project token address cannot be zero', () => {
        const invalidInput = {
            ...createPoolInput,
            fixedPriceLbpParams: {
                ...createPoolInput.fixedPriceLbpParams,
                projectToken: zeroAddress,
            },
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError(
                'Create Pool',
                'Project token address cannot be zero',
            ),
        );
    });

    test('Reserve token address cannot be zero', () => {
        const invalidInput = {
            ...createPoolInput,
            fixedPriceLbpParams: {
                ...createPoolInput.fixedPriceLbpParams,
                reserveToken: zeroAddress,
            },
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError(
                'Create Pool',
                'Reserve token address cannot be zero',
            ),
        );
    });

    test('Project token rate must be greater than 0', () => {
        const invalidInput = {
            ...createPoolInput,
            fixedPriceLbpParams: {
                ...createPoolInput.fixedPriceLbpParams,
                projectTokenRate: 0n,
            },
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError(
                'Create Pool',
                'Project token rate must be greater than 0',
            ),
        );
    });

    test('Project token rate must be greater than 0 (negative)', () => {
        const invalidInput = {
            ...createPoolInput,
            fixedPriceLbpParams: {
                ...createPoolInput.fixedPriceLbpParams,
                projectTokenRate: -1n,
            },
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError(
                'Create Pool',
                'Project token rate must be greater than 0',
            ),
        );
    });

    // Swap fee percentage validation
    // Fees are 18-decimal, fixed point values, stored in the Vault using 24 bits.
    // This provides 0.00001% resolution (any non-zero bits < 1e11 will cause precision loss).
    // FixedPriceLBPool.sol: _MIN_SWAP_FEE_PERCENTAGE = 0, _MAX_SWAP_FEE_PERCENTAGE = 10e16 (10%)
    // Note: Unlike WeightedPool (MIN = 0.001%), FixedPriceLBPool allows 0% minimum swap fee.

    test('Swap fee percentage cannot exceed 10%', () => {
        const invalidInput = {
            ...createPoolInput,
            swapFeePercentage: parseUnits('0.11', 18), // 11%
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError(
                'Create Pool',
                'Swap fee percentage cannot exceed 100000000000000000 (10%)',
            ),
        );
    });

    test('Swap fee percentage can be exactly 10%', () => {
        const validInput = {
            ...createPoolInput,
            swapFeePercentage: parseUnits('0.10', 18), // 10%
        };
        expect(() => createPool.buildCall(validInput)).not.toThrow();
    });

    test('Swap fee percentage can be 0% (minimum for FixedPriceLBPool)', () => {
        const validInput = {
            ...createPoolInput,
            swapFeePercentage: 0n, // 0% - allowed for FixedPriceLBPool
        };
        expect(() => createPool.buildCall(validInput)).not.toThrow();
    });

    test('Start time must be before end time', () => {
        const invalidInput = {
            ...createPoolInput,
            fixedPriceLbpParams: {
                ...createPoolInput.fixedPriceLbpParams,
                startTimestamp:
                    createPoolInput.fixedPriceLbpParams.endTimestamp +
                    BigInt(1),
            },
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError(
                'Create Pool',
                'Start time must be before end time',
            ),
        );
    });

    test('Start time must be in the future', () => {
        const invalidInput = {
            ...createPoolInput,
            fixedPriceLbpParams: {
                ...createPoolInput.fixedPriceLbpParams,
                startTimestamp: BigInt(Math.floor(Date.now() / 1000) - 86400), // now - 1 day
            },
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError(
                'Create Pool',
                'Start time must be in the future',
            ),
        );
    });

    test('Tokens must be different', () => {
        const invalidInput = {
            ...createPoolInput,
            fixedPriceLbpParams: {
                ...createPoolInput.fixedPriceLbpParams,
                projectToken: BAL.address,
                reserveToken: BAL.address,
            },
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError('Create Pool', 'Tokens must be different'),
        );
    });

    test('Valid input passes validation', () => {
        expect(() => createPool.buildCall(createPoolInput)).not.toThrow();
    });
});
