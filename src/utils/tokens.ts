import { Address, getContract } from 'viem';
import { vaultV2Abi, vaultV3Abi } from '../abi';
import { VAULT, VAULT_V3 } from './constants';

export async function getTokenDecimals(tokenAddress, client) {
    try {
        const abi = [
            {
                inputs: [],
                name: 'decimals',
                outputs: [
                    {
                        internalType: 'uint8',
                        name: '',
                        type: 'uint8',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
        ];

        const tokenContract = getContract({
            abi,
            address: tokenAddress,
            client,
        });
        const decimals = await tokenContract.read.decimals();
        return decimals;
    } catch (e) {
        console.warn(e);
        throw new Error(
            `Error: Unable to get Token Decimals from token: ${tokenAddress}`,
        );
    }
}

export async function getPoolTokensV2(poolId, client) {
    try {
        const chainId = await client.getChainId();
        const vaultV2 = getContract({
            abi: vaultV2Abi,
            address: VAULT[chainId],
            client,
        });
        const poolTokensFromVault = await vaultV2.read.getPoolTokens([poolId]);
        return poolTokensFromVault;
    } catch (e) {
        console.warn(e);
        throw new Error(
            `Error: Unable to get pool tokens using this pool id: ${poolId}`,
        );
    }
}

export async function getPoolTokensV3(poolAddress, client) {
    try {
        const chainId = await client.getChainId();
        const vaultV3 = getContract({
            abi: vaultV3Abi,
            address: VAULT_V3[chainId],
            client: client,
        });
        return (await vaultV3.read.getPoolTokens([poolAddress])) as Address[];
    } catch (e) {
        console.warn(e);
        throw new Error(
            `Error: Unable to get pool tokens using this pool address: ${poolAddress}`,
        );
    }
}
