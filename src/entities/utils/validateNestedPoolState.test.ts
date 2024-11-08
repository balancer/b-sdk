// pnpm test -- nestedPoolStateValidation.test.ts
import { describe, expect, test } from 'vitest';
import { NestedPoolState, NestedPoolV2, validateNestedPoolState } from '..';
import { PoolType } from '@/types';

describe('nested pool state validations', () => {
    describe('happy case', () => {
        test('should be valid', () => {
            expect(validateNestedPoolState(happyPoolState)).to.be.true;
        });
    });
    describe('A main token must exist as a token of a pool', () => {
        test('should throw', () => {
            // Test the exact error message
            expect(() => validateNestedPoolState(missingMain)).toThrowError(
                /^NestedPoolState, main token must exist as a token of a pool$/,
            );
        });
    });
    describe("A main token can't be token of > 1 pool", () => {
        test('should throw', () => {
            // Test the exact error message
            expect(() =>
                validateNestedPoolState(multiTokenPoolState),
            ).toThrowError(
                /^NestedPoolState, main token can't be token of more than 1 pool$/,
            );
        });
    });
    describe('A main token only supported to a max of 1 level of nesting', () => {
        test('should throw', () => {
            // Test the exact error message
            expect(() => validateNestedPoolState(deepPoolState)).toThrowError(
                /^NestedPoolState, main token only supported to a max of 1 level of nesting$/,
            );
        });
    });
});

/**
                        TOP
                3POOL_BPT/auraBal_BPT/WETH

        3POOL_BPT           auraBal_BPT
        DAI/USDC/USDT       auraBal/8020_BPT

                                8020_BPT
                                BAL/WETH
 */
// Does not return 8020_BPT pool
const happyPools: NestedPoolV2[] = [
    {
        id: '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0',
        address: '0x08775ccb6674d6bdceb0797c364c2653ed84f384',
        type: PoolType.Weighted,
        level: 1,
        tokens: [
            {
                address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc', // 3POOL-BPT
                decimals: 18,
                index: 0,
            },
            {
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                decimals: 18,
                index: 1,
            },
            {
                address: '0x3dd0843A028C86e0b760b1A76929d1C5Ef93a2dd', // auraBalBpt
                decimals: 18,
                index: 2,
            },
        ],
    },
    {
        id: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
        address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc',
        type: PoolType.ComposableStable,
        level: 0,
        tokens: [
            {
                address: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
                decimals: 18,
                index: 0,
            },
            {
                address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc', // 3POOL-BPT
                decimals: 18,
                index: 1,
            },
            {
                address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
                decimals: 6,
                index: 2,
            },
            {
                address: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
                decimals: 6,
                index: 3,
            },
        ],
    },
    {
        id: '0x3dd0843a028c86e0b760b1a76929d1c5ef93a2dd000200000000000000000249',
        address: '0x3dd0843A028C86e0b760b1A76929d1C5Ef93a2dd',
        type: PoolType.ComposableStable,
        level: 0,
        tokens: [
            {
                address: '0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56', // 8020Bpt
                decimals: 18,
                index: 0,
            },
            {
                address: '0x616e8BfA43F920657B3497DBf40D6b1A02D4608d', // auraBal
                decimals: 18,
                index: 1,
            },
            {
                address: '0x3dd0843A028C86e0b760b1A76929d1C5Ef93a2dd', // BPT
                decimals: 18,
                index: 2,
            },
        ],
    },
];

// Includes 8020_BPT pool
const deepPools: NestedPoolV2[] = [
    { ...happyPools[0], level: 2 },
    { ...happyPools[1], level: 1 },
    { ...happyPools[2], level: 1 },
    {
        id: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
        address: '0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56',
        type: PoolType.Weighted,
        level: 0,
        tokens: [
            {
                address: '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
                decimals: 18,
                index: 0,
            },
            {
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                decimals: 18,
                index: 1,
            },
        ],
    },
];

// Returning main tokens as 1 level
const happyPoolState: NestedPoolState = {
    pools: [...happyPools],
    protocolVersion: 2,
    mainTokens: [
        {
            address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
            decimals: 18,
        },
        {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
            decimals: 18,
        },
        {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
            decimals: 6,
        },
        {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
            decimals: 6,
        },
        {
            address: '0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56', // 8020Bpt
            decimals: 18,
        },
        {
            address: '0x616e8BfA43F920657B3497DBf40D6b1A02D4608d', // auraBal
            decimals: 18,
        },
    ],
};

const missingMain: NestedPoolState = {
    ...happyPoolState,
    mainTokens: [
        ...happyPoolState.mainTokens,
        {
            address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', // wstEth
            decimals: 18,
        },
    ],
};

// WETH is token in two pools
const multiTokenPoolState: NestedPoolState = {
    protocolVersion: 2,
    pools: [...deepPools],
    mainTokens: [
        {
            address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
            decimals: 18,
        },
        {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
            decimals: 18,
        },
        {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
            decimals: 6,
        },
        {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
            decimals: 6,
        },
        {
            address: '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
            decimals: 18,
        },
    ],
};

// BAL is 2 level of nesting
const deepPoolState: NestedPoolState = {
    protocolVersion: 2,
    pools: [...deepPools],
    mainTokens: [
        {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
            decimals: 18,
        },
        {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
            decimals: 6,
        },
        {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
            decimals: 6,
        },
        {
            address: '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
            decimals: 18,
        },
    ],
};
