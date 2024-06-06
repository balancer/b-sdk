import { PublicClient, getContract } from 'viem';
import { cowAmmPoolAbi } from '@/abi/cowAmmPool';
import { Address } from '@/types';

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
