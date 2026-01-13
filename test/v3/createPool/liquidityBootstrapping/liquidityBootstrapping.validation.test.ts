// pnpm test createPool/liquidityBootstrapping/liquidityBootstrapping.validation.test.ts

import { parseEther, parseUnits } from 'viem';
import {
    ChainId,
    PoolType,
    CreatePool,
    CreatePoolLiquidityBootstrappingInput,
    inputValidationError,
} from 'src';
import { TOKENS } from 'test/lib/utils/addresses';

const chainId = ChainId.SEPOLIA;
const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('LiquidityBootstrapping Input Validation', () => {
    const createPool = new CreatePool();
    let createPoolInput: CreatePoolLiquidityBootstrappingInput;

    beforeAll(() => {
        // Start with a valid input and modify individual params to expect errors
        createPoolInput = {
            protocolVersion: 3,
            swapFeePercentage: parseUnits('0.01', 18),
            lbpParams: {
                owner: '0x0000000000000000000000000000000000000001',
                projectToken: BAL.address,
                reserveToken: WETH.address,
                startTimestamp: BigInt(Math.floor(Date.now() / 1000) + 86400), // now + 1 day
                endTimestamp: BigInt(Math.floor(Date.now() / 1000) + 691200), // now + 8 days
                blockProjectTokenSwapsIn: true,
                projectTokenStartWeight: parseEther('0.5'),
                reserveTokenStartWeight: parseEther('0.5'),
                projectTokenEndWeight: parseEther('0.3'),
                reserveTokenEndWeight: parseEther('0.7'),
            },
            symbol: 'LBP',
            chainId,
            poolType: PoolType.LiquidityBootstrapping,
        };
    });

    test('Start weights must sum to 100', () => {
        const invalidInput = {
            ...createPoolInput,
            lbpParams: {
                ...createPoolInput.lbpParams,
                projectTokenStartWeight: parseEther('0.6'),
                reserveTokenStartWeight: parseEther('0.5'),
            },
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError(
                'Create Pool',
                'Start weights must sum to 100',
            ),
        );
    });

    test('End weights must sum to 100', () => {
        const invalidInput = {
            ...createPoolInput,
            lbpParams: {
                ...createPoolInput.lbpParams,
                projectTokenEndWeight: parseEther('0.4'),
                reserveTokenEndWeight: parseEther('0.7'),
            },
        };
        expect(() => createPool.buildCall(invalidInput)).toThrowError(
            inputValidationError('Create Pool', 'End weights must sum to 100'),
        );
    });

    test('Start time must be before end time', () => {
        const invalidInput = {
            ...createPoolInput,
            lbpParams: {
                ...createPoolInput.lbpParams,
                startTimestamp:
                    createPoolInput.lbpParams.endTimestamp + BigInt(1),
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
            lbpParams: {
                ...createPoolInput.lbpParams,
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
            lbpParams: {
                ...createPoolInput.lbpParams,
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
