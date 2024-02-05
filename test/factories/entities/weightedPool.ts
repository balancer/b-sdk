import { WeightedPool } from '@/entities/pools/weighted';
import { Address, Hex } from '@/types';

export const weightedPoolFactory = ({
    id = '0xeb30c85cc528537f5350cf5684ce6a4538e13394000200000000000000000059' as Hex,
    address = '0xeb30c85cc528537f5350cf5684ce6a4538e13394' as Address,
    name = 'WeightedPool' as string,
    poolType = 'Weighted' as const,
    poolTypeVersion = 4,
    swapFee = '0' as `${number}`,
    tokens = [
        {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Address,
            weight: '0.5' as `${number}`,
            balance: '1000000' as `${number}`,
            decimals: 6,
            symbol: 'USDC',
            name: 'USD Coin',
            index: 0,
        },
        {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f' as Address,
            weight: '0.5' as `${number}`,
            balance: '1000000000000000000' as `${number}`,
            decimals: 18,
            symbol: 'DAI',
            name: 'DAI Coin',
            index: 1,
        },
    ],
    swapEnabled = true,
    isPaused = false,
    inRecoveryMode = false,
    tokensList = [
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0x6b175474e89094c44da98b954eedeac495271d0f',
    ] as `0x${string}`[],
    liquidity = '1000000000000000000' as `${number}`,
    totalShares = '1000000000000000000' as `${number}`,
}) =>
    WeightedPool.fromRawPool(1, {
        id,
        address,
        name,
        poolType,
        poolTypeVersion,
        swapFee,
        tokens,
        swapEnabled,
        isPaused,
        inRecoveryMode,
        tokensList,
        liquidity,
        totalShares,
    });

export default weightedPoolFactory;
