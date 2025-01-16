import { ChainId, NestedPoolState } from '@/index';
import { POOLS, TOKENS } from 'test/lib/utils';

const chainId = ChainId.SEPOLIA;
export const NESTED_WITH_BOOSTED_POOL = POOLS[chainId].NESTED_WITH_BOOSTED_POOL;
export const BOOSTED_POOL = POOLS[chainId].MOCK_BOOSTED_POOL;
export const stataUSDC = TOKENS[chainId].stataUSDC;
export const USDC = TOKENS[chainId].USDC_AAVE;
export const stataUSDT = TOKENS[chainId].stataUSDT;
export const USDT = TOKENS[chainId].USDT_AAVE;
export const WETH = TOKENS[chainId].WETH;

export const nestedWithBoostedPool: NestedPoolState = {
    protocolVersion: 3,
    pools: [
        {
            id: NESTED_WITH_BOOSTED_POOL.id,
            address: NESTED_WITH_BOOSTED_POOL.address,
            type: NESTED_WITH_BOOSTED_POOL.type,
            level: 1,
            tokens: [
                {
                    address: BOOSTED_POOL.address,
                    decimals: BOOSTED_POOL.decimals,
                    index: 0,
                    underlyingToken: null,
                },
                {
                    address: WETH.address,
                    decimals: WETH.decimals,
                    index: 1,
                    underlyingToken: null,
                },
            ],
        },
        {
            id: BOOSTED_POOL.id,
            address: BOOSTED_POOL.address,
            type: BOOSTED_POOL.type,
            level: 0,
            tokens: [
                {
                    address: stataUSDC.address,
                    decimals: stataUSDC.decimals,
                    index: 0,
                    underlyingToken: {
                        address: USDC.address,
                        decimals: 6,
                        index: 0,
                    },
                },
                {
                    address: stataUSDT.address,
                    decimals: stataUSDT.decimals,
                    index: 1,
                    underlyingToken: {
                        address: USDT.address,
                        decimals: 6,
                        index: 1,
                    },
                },
            ],
        },
    ],
    mainTokens: [
        {
            address: WETH.address,
            decimals: WETH.decimals,
        },
        {
            address: USDT.address,
            decimals: USDT.decimals,
        },
        {
            address: USDC.address,
            decimals: USDC.decimals,
        },
    ],
};
