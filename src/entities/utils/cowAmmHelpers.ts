import {
    PublicClient,
    createPublicClient,
    formatEther,
    formatUnits,
    getContract,
    http,
} from 'viem';
import { cowAmmPoolAbi } from '@/abi/cowAmmPool';
import { Address } from '@/types';
import { PoolState, PoolStateWithBalances } from '../types';
import { CHAINS } from '@/utils';
import { getSortedTokens } from './getSortedTokens';
import { HumanAmount } from '@/data';

type MulticallContract = {
    address: Address;
    abi: any;
    functionName: string;
    args?: any;
};

export const getPoolStateWithBalancesCowAmm = async (
    poolState: PoolState,
    chainId: number,
    rpcUrl: string,
): Promise<PoolStateWithBalances> => {
    const totalSupplyContract = {
        address: poolState.address,
        abi: cowAmmPoolAbi,
        functionName: 'totalSupply',
    };
    const sortedTokens = getSortedTokens(poolState.tokens, chainId);
    const getBalanceContracts = sortedTokens.map((token) => ({
        address: poolState.address,
        abi: cowAmmPoolAbi,
        functionName: 'getBalance',
        args: [token.address],
    }));

    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const outputs = await publicClient.multicall({
        contracts: [
            totalSupplyContract,
            ...getBalanceContracts,
        ] as MulticallContract[],
    });

    if (outputs.some((output) => output.status === 'failure')) {
        throw new Error(
            'Error: Unable to get pool state with balances for CowAmm pool.',
        );
    }

    const totalShares = outputs[0].result as bigint;
    const balances = outputs.slice(1).map((output) => output.result as bigint);

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

export const getPoolTokensCowAmm = async (
    poolId: Address,
    client: PublicClient,
): Promise<Address[]> => {
    try {
        const poolContract = getContract({
            abi: cowAmmPoolAbi,
            address: poolId,
            client,
        });
        const tokens = await poolContract.read.getFinalTokens();
        return tokens as Address[];
    } catch (e) {
        console.warn(e);
        throw new Error(
            `Error: Unable to get pool tokens using this pool id: ${poolId}`,
        );
    }
};

export const getPoolTokenBalanceCowAmm = async (
    poolId: Address,
    tokenAddress: Address,
    client: PublicClient,
): Promise<bigint> => {
    try {
        const poolContract = getContract({
            abi: cowAmmPoolAbi,
            address: poolId,
            client,
        });
        const balance = await poolContract.read.getBalance([tokenAddress]);
        return balance;
    } catch (e) {
        console.warn(e);
        throw new Error(
            `Error: Unable to get pool token balance using this pool id: ${poolId} and token address: ${tokenAddress}`,
        );
    }
};

export const getTotalSupplyCowAmm = async (
    poolAddress: Address,
    client: PublicClient,
): Promise<bigint> => {
    try {
        const poolContract = getContract({
            abi: cowAmmPoolAbi,
            address: poolAddress,
            client,
        });

        const totalSupply: bigint =
            (await poolContract.read.totalSupply()) as bigint;

        return totalSupply;
    } catch (e) {
        console.warn(e);
        throw new Error(
            `Error: Unable to get total supply for pool ${poolAddress}`,
        );
    }
};
