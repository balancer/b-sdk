// pnpm test -- createPool/weighted.test.ts

import { parseEther, zeroAddress } from 'viem';
import {
    ChainId,
    PoolType,
    TokenType,
    CreatePool,
    CreatePoolV3WeightedInput,
} from 'src';
import { TOKENS } from 'test/lib/utils/addresses';

describe('Create Weighted Pool tests', () => {
    const chainId = ChainId.SEPOLIA;
    const createPool = new CreatePool();
    let createWeightedPoolInput: CreatePoolV3WeightedInput;
    beforeAll(async () => {
        createWeightedPoolInput = {
            poolType: PoolType.Weighted,
            symbol: '50BAL-50WETH',
            tokens: [
                {
                    address: TOKENS[chainId].BAL.address, // BAL
                    weight: parseEther(`${1 / 2}`),
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                },
                {
                    address: TOKENS[chainId].WETH.address, // WETH
                    weight: parseEther(`${1 / 2}`),
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                },
            ],
            chainId,
            protocolVersion: 3,
        };
    });

    test('Wrong weights, expects error', async () => {
        const tokens: CreatePoolV3WeightedInput['tokens'] = [
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].WETH.address, // WETH
                weight: parseEther(`${1 / 4}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createWeightedPoolInput, tokens }),
        ).toThrowError('Weights must sum to 1e18');
    });

    test('Weight value 0, expects error', async () => {
        const tokens: CreatePoolV3WeightedInput['tokens'] = [
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther('0'),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].WETH.address, // WETH
                weight: parseEther('1'),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createWeightedPoolInput, tokens }),
        ).toThrowError('Weight cannot be 0');
    });
    test('Duplicate token addresses, expects error', async () => {
        const tokens: CreatePoolV3WeightedInput['tokens'] = [
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther(`${1 / 4}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther(`${1 / 4}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].WETH.address, // WETH
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createWeightedPoolInput, tokens }),
        ).toThrowError('Duplicate token addresses');
    });
    test('Allowing only TokenType.STANDARD to have address zero as rateProvider', async () => {
        const tokens: CreatePoolV3WeightedInput['tokens'] = [
            {
                address: TOKENS[chainId].BAL.address, // BAL
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
            },
            {
                address: TOKENS[chainId].WETH.address, // WETH
                weight: parseEther(`${1 / 2}`),
                rateProvider: zeroAddress,
                tokenType: TokenType.ERC4626_TOKEN,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createWeightedPoolInput, tokens }),
        ).toThrowError(
            'Only TokenType.STANDARD is allowed to have zeroAddress rateProvider',
        );
    });
});
