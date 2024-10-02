// pnpm test -- createPool/stable/stable.validation.test.ts

import { parseEther, zeroAddress } from 'viem';
import {
    ChainId,
    PoolType,
    TokenType,
    CreatePool,
    CreatePoolV3StableInput,
} from 'src';
import { TOKENS } from 'test/lib/utils/addresses';
import {
    MAX_AMP,
    MIN_AMP,
    MAX_TOKENS,
} from 'src/entities/inputValidator/stable/inputValidatorStable';

describe('Create stable pool input validation tests', () => {
    const chainId = ChainId.SEPOLIA;
    const createPool = new CreatePool();
    let createStablePoolInput: CreatePoolV3StableInput;
    beforeAll(async () => {
        createStablePoolInput = {
            poolType: PoolType.Stable,
            name: 'DAI/USDC Stable Pool',
            symbol: 'DAI-USDC',
            tokens: [
                {
                    address: TOKENS[chainId].DAI.address, // DAI
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: TOKENS[chainId].USDC.address, // USDC
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            amplificationParameter: 420n, // min 1n to max 5000n
            swapFeePercentage: parseEther('0.001'), // min 1e12 to max 10e16
            poolHooksContract: zeroAddress,
            pauseManager: zeroAddress,
            swapFeeManager: zeroAddress,
            chainId,
            protocolVersion: 3,
            enableDonation: false,
            disableUnbalancedLiquidity: false,
        };

        console.log('createStablePoolInput', createStablePoolInput);
    });

    test('Should throw error if duplicate token addresses', async () => {
        const tokens: CreatePoolV3StableInput['tokens'] = [
            {
                address: TOKENS[chainId].DAI.address, // DAI
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: TOKENS[chainId].DAI.address, // DAI
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: TOKENS[chainId].USDC.address, // USDC
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createStablePoolInput, tokens }),
        ).toThrowError('Duplicate token addresses');
    });

    test('Should throw error if less than minimum number of tokens', async () => {
        const tokens: CreatePoolV3StableInput['tokens'] = [
            {
                address: TOKENS[chainId].DAI.address, // DAI
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createStablePoolInput, tokens }),
        ).toThrowError('Minimum of 2 tokens required');
    });

    test('Should throw error if more than maximum number of tokens', async () => {
        const tokens: CreatePoolV3StableInput['tokens'] = [
            {
                address: TOKENS[chainId].DAI.address, // DAI
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: TOKENS[chainId].USDC.address, // USDC
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: TOKENS[chainId].scUSD.address, // scUSD
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: TOKENS[chainId].WETH.address, // WETH
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: TOKENS[chainId].BAL.address, // BAL
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: TOKENS[chainId].scDAI.address, // scDAI
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createStablePoolInput, tokens }),
        ).toThrowError(
            `Stable pools can only have a maximum of ${MAX_TOKENS} tokens`,
        );
    });
    test('Should throw error if token with non-standard type has no rateProvider', async () => {
        const tokens: CreatePoolV3StableInput['tokens'] = [
            {
                address: TOKENS[chainId].DAI.address, // DAI
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: TOKENS[chainId].USDC.address, // USDC
                rateProvider: zeroAddress,
                tokenType: TokenType.ERC4626_TOKEN,
                paysYieldFees: false,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createStablePoolInput, tokens }),
        ).toThrowError(
            'Only TokenType.STANDARD is allowed to have zeroAddress rateProvider',
        );
    });

    test('Should throw error if amplification parameter below minimum', async () => {
        const amplificationParameter = MIN_AMP - 1n;
        expect(() =>
            createPool.buildCall({
                ...createStablePoolInput,
                amplificationParameter,
            }),
        ).toThrowError(`Amplification parameter below minimum of ${MIN_AMP}`);
    });

    test('Should throw error if amplification parameter above maximum', async () => {
        const amplificationParameter = MAX_AMP + 1n;
        expect(() =>
            createPool.buildCall({
                ...createStablePoolInput,
                amplificationParameter,
            }),
        ).toThrowError(`Amplification parameter above maximum of ${MAX_AMP}`);
    });
});
