import {
    Address,
    createPublicClient,
    formatEther,
    formatUnits,
    http,
} from 'viem';
import { PoolType } from '@/types';
import { HumanAmount } from '@/data';
import { CHAINS } from '@/utils';
import { VAULT } from '@/utils/constantsV2';
import { PoolState, PoolStateWithBalances } from '../types';
import { getSortedTokens } from './getSortedTokens';
import { vaultV2Abi } from '@/abi';

export const getPoolStateWithBalancesV2 = async (
    poolState: PoolState,
    chainId: number,
    rpcUrl: string,
): Promise<PoolStateWithBalances> => {
    const totalSupplyContract = getTotalSupplyContractV2(poolState);
    const getBalanceContracts = {
        address: VAULT[chainId],
        abi: vaultV2Abi,
        functionName: 'getPoolTokens' as const,
        args: [poolState.id] as const,
    };

    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const outputs = await publicClient.multicall({
        contracts: [totalSupplyContract, getBalanceContracts],
    });

    if (outputs.some((output) => output.status === 'failure')) {
        console.log(
            'Multicall error/s getting pool state with balances for v2 pool',
            {
                errors: outputs
                    .filter((o) => o.status === 'failure')
                    .map((o) => o.error),
                chainId,
                poolId: poolState.id,
            },
        );
        throw new Error(
            'Error: Unable to get pool state with balances for v2 pool.',
        );
    }

    const totalShares = outputs[0].result as bigint;
    const [_, balances] = outputs[1].result as [Address[], bigint[], bigint];

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

// Private

const getTotalSupplyContractV2 = (poolState: PoolState) => {
    if (poolState.type === PoolType.ComposableStable) {
        return {
            address: poolState.address,
            abi: [
                {
                    inputs: [],
                    name: 'getActualSupply',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256',
                        },
                    ],
                    stateMutability: 'view',
                    type: 'function',
                },
            ],
            functionName: 'getActualSupply',
        };
    }

    return {
        address: poolState.address,
        abi: [
            {
                inputs: [],
                name: 'totalSupply',
                outputs: [
                    {
                        internalType: 'uint256',
                        name: '',
                        type: 'uint256',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
        ],
        functionName: 'totalSupply',
    };
};
