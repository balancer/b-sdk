import { Address, Client, Hex, PublicClient, getContract } from 'viem';
import { vaultV2Abi, vaultExtensionV3Abi } from '../abi';
import { VAULT, VAULT_V3 } from './constants';

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
            abi: vaultExtensionV3Abi,
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

export async function getTotalSupply(
    poolAddress: Address,
    client: PublicClient,
): Promise<bigint> {
    const abi = [
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
    ];

    try {
        const poolContract = getContract({
            abi,
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
}

export async function getActualSupply(
    poolAddress: Address,
    client: PublicClient,
): Promise<bigint> {
    const abi = [
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
    ];

    try {
        const poolContract = getContract({
            abi,
            address: poolAddress,
            client,
        });

        const actualSupply: bigint =
            (await poolContract.read.getActualSupply()) as bigint;

        return actualSupply;
    } catch (e) {
        console.warn(e);
        throw new Error(
            `Error: Unable to get actual supply for pool ${poolAddress}`,
        );
    }
}
