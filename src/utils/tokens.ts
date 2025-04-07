import { Address, Client, Hex, PublicClient, getContract } from 'viem';
import { vaultV2Abi, vaultExtensionAbi } from '../abi';
import { balancerV2Contracts } from './balancerV2Contracts';
import { balancerV3Contracts } from './balancerV3Contracts';

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
            address: balancerV2Contracts.Vault[chainId],
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
            abi: vaultExtensionAbi,
            address: balancerV3Contracts.Vault[chainId],
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
