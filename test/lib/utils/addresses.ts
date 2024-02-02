import { Address, Hex, PoolType } from '@/types';
import { ChainId } from '@/utils';

export type TestToken = { address: Address; decimals: number; slot?: number };

export const TOKENS: Record<number, Record<string, TestToken>> = {
    [ChainId.MAINNET]: {
        WETH: {
            address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            decimals: 18,
            slot: 3,
        },
        DAI: {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f',
            decimals: 18,
            slot: 2,
        },
        USDC: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            decimals: 6,
            slot: 9,
        },
        USDT: {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            decimals: 6,
            slot: 2,
        },
    },
    [ChainId.POLYGON]: {
        USDC: {
            address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            decimals: 6,
        },
    },
    [ChainId.SEPOLIA]: {
        BAL: {
            address: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
            decimals: 18,
            slot: 1,
        },
        WETH: {
            address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
            decimals: 18,
            slot: 3,
        },
    },
};

export type TestPool = TestToken & { id: Hex; type: PoolType };

export const POOLS: Record<number, Record<string, TestPool>> = {
    [ChainId.MAINNET]: {
        BPT_3POOL: {
            address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc',
            id: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
            type: PoolType.ComposableStable,
            decimals: 18,
            slot: 0,
        },
        BPT_WETH_3POOL: {
            address: '0x08775ccb6674d6bdceb0797c364c2653ed84f384',
            id: '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
    },
    [ChainId.SEPOLIA]: {
        MOCK_WEIGHTED_POOL: {
            address: '0xB7FdEa33364Da24d6ad01C98EFAb7b539B917A83',
            id: '0xB7FdEa33364Da24d6ad01C98EFAb7b539B917A83',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
    },
};
