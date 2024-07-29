import { Client, PublicActions, WalletActions } from 'viem';

import { Address } from '@/types';

export const getNonce = async (
    client: Client & WalletActions & PublicActions,
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
