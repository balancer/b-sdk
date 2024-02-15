import { getContract } from 'viem';

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
        client,
    });
    const decimals = await tokenContract.read.decimals();
    return decimals;
}
