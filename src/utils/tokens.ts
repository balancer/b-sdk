import { getContract } from 'viem';

export function sortTokensByAddress(tokens: (any & { address: string })[]) {
    return tokens.sort((a, b) => a.address.localeCompare(b.address));
}

export async function getTokenDecimals(tokenAddress, client) {
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
        publicClient: client,
    });
    const decimals = await tokenContract.read.decimals();
    console.log(decimals);
    return decimals;
}
