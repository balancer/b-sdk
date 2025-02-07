import { Address, Client, Hex, PublicClient, getContract } from 'viem';
import { vaultV2Abi, vaultExtensionAbi_V3 } from '../abi';
import { VAULT } from './constantsV2';
import { VAULT_V3 } from './constantsV3';

export async function getTokenDecimals(
    tokenAddress: Address,
    client: Client,
): Promise<number> {
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
        const decimals: number =
            (await tokenContract.read.decimals()) as number;
        return decimals;
    } catch (e) {
        console.warn(e);
        throw new Error(
            `Error: Unable to get Token Decimals from token: ${tokenAddress}`,
        );
    }
}

export async function getPoolTokensV2(
    poolId: Hex,
    client: PublicClient,
): Promise<[Address[], bigint[], bigint]> {
    try {
        const chainId = await client.getChainId();
        const vaultV2 = getContract({
            abi: vaultV2Abi,
            address: VAULT[chainId],
            client,
        });
        const poolTokensFromVault = (await vaultV2.read.getPoolTokens([
            poolId,
        ])) as [Address[], bigint[], bigint];
        return poolTokensFromVault;
    } catch (e) {
        console.warn(e);
        throw new Error(
            `Error: Unable to get pool tokens using this pool id: ${poolId}`,
        );
    }
}

export async function getPoolTokensV3(
    poolAddress: Address,
    client: PublicClient,
): Promise<Address[]> {
    try {
        const chainId = await client.getChainId();
        const vaultV3 = getContract({
            abi: vaultExtensionAbi_V3,
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
