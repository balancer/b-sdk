import { createPublicClient, formatEther, formatUnits, http } from 'viem';

import { HumanAmount } from '@/data';
import { Address } from '@/types';
import { CHAINS, VAULT_V3 } from '@/utils';

import { getSortedTokens } from './getSortedTokens';
import { PoolState, PoolStateWithBalances } from '../types';
import { vaultExtensionV3Abi } from '@/abi';

type MulticallContract = {
    address: Address;
    abi: any;
    functionName: string;
    args?: any;
};

export const getPoolStateWithBalancesV3 = async (
    poolState: PoolState,
    chainId: number,
    rpcUrl: string,
): Promise<PoolStateWithBalances> => {
    const totalSupplyContract = {
        address: VAULT_V3[chainId],
        abi: vaultExtensionV3Abi,
        functionName: 'totalSupply',
        args: [poolState.address],
    };
    const getBalanceContracts = {
        address: VAULT_V3[chainId],
        abi: vaultExtensionV3Abi,
        functionName: 'getCurrentLiveBalances',
        args: [poolState.address],
    };

    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const outputs = await publicClient.multicall({
        contracts: [
            totalSupplyContract,
            getBalanceContracts,
        ] as MulticallContract[],
    });

    if (outputs.some((output) => output.status === 'failure')) {
        throw new Error(
            'Error: Unable to get pool state with balances for v3 pool.',
        );
    }

    const totalShares = outputs[0].result as bigint;
    const balances = outputs[1].result as bigint[];

    const sortedTokens = getSortedTokens(poolState.tokens, chainId);

    const poolStateWithBalances: PoolStateWithBalances = {
        ...poolState,
        tokens: sortedTokens.map((token, i) => ({
            address: token.address,
            decimals: token.decimals,
            index: i,
            balance: formatUnits(balances[i], token.decimals) as HumanAmount,
        })),
        totalShares: formatEther(totalShares) as HumanAmount,
    };
    return poolStateWithBalances;
};
