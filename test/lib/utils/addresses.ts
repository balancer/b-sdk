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
        vETH: {
            address: '0x4bc3263eb5bb2ef7ad9ab6fb68be80e43b43801f',
            decimals: 18,
        },
        bb_s_DAI: {
            address: '0x2b218683178d029bab6c9789b1073aa6c96e5176',
            decimals: 18,
        },
        bb_a_USDC: {
            address: '0x82698aecc9e28e9bb27608bd52cf57f704bd1b83',
            decimals: 18,
        },
    },
    [ChainId.POLYGON]: {
        USDC: {
            address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            decimals: 6,
        },
        WMATIC: {
            address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
            decimals: 18,
            slot: 3,
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
        vETH_WETH: {
            id: '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76000000000000000000000570',
            address: '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76',
            type: PoolType.ComposableStable,
            decimals: 18,
            slot: 0,
        },
        '50bb_sDAI_50bb_a_USDC': {
            id: '0x0da692ac0611397027c91e559cfd482c4197e4030002000000000000000005c9',
            address: '0x0da692ac0611397027c91e559cfd482c4197e403',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
    },
    [ChainId.POLYGON]: {
        DAO_st_WMATIC: {
            id: '0x60f46b189736c0d2ae52a79382b64c1e2a86b0d9000200000000000000000cc4',
            address: '0x60f46b189736c0d2ae52a79382b64c1e2a86b0d9',
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
