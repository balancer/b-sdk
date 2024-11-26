import { PoolState } from '@/entities';
import { PoolType } from '@/types';
import { ChainId } from '@/utils';
import { POOLS, TOKENS } from 'test/lib/utils';

const chainId = ChainId.SEPOLIA;
export const MOCK_WETH_BAL_POOL = POOLS[chainId].MOCK_WETH_BAL_POOL;
export const WETH = TOKENS[chainId].WETH;
const BAL = TOKENS[chainId].BAL;

export const weightedWethBal: PoolState = {
    id: MOCK_WETH_BAL_POOL.id,
    address: MOCK_WETH_BAL_POOL.address,
    type: PoolType.Weighted,
    protocolVersion: 3,
    tokens: [
        {
            address: WETH.address,
            decimals: WETH.decimals,
            index: 0,
        },
        {
            address: BAL.address,
            decimals: BAL.decimals,
            index: 1,
        },
    ],
};
