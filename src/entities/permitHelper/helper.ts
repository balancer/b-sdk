import { Address } from '@/types';
import { PublicWalletClient } from '@/utils';

export const getNonce = async (
    client: PublicWalletClient,
    token: Address,
    owner: Address,
) => {
    return await client.readContract({
        abi: [
            {
                inputs: [
                    { internalType: 'address', name: 'owner', type: 'address' },
                ],
                name: 'nonces',
                outputs: [
                    { internalType: 'uint256', name: '', type: 'uint256' },
                ],
                stateMutability: 'view',
                type: 'function',
            },
        ],
        address: token,
        functionName: 'nonces',
        args: [owner],
    });
};
