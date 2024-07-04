import { Client, PublicActions, WalletActions } from 'viem';

import { weightedPoolAbi_V3 } from '@/abi';
import { Hex } from '@/types';
import { MAX_UINT256 } from '@/utils';
import { getNonce } from './helper';

export type PermitSignature = {
    r: Hex;
    s: Hex;
    v: number;
};

export type PermitApproval = {
    /** Address of the token to approve */
    token: Hex;
    /** Owner of the tokens. Usually the currently connected address. */
    owner: Hex;
    /** Address to grant allowance to */
    spender: Hex;
    /** Amount to approve */
    amount: bigint;
    /** Nonce of the permit */
    nonce: bigint;
    /** Expiration of this approval, in SECONDS */
    deadline: bigint;
};

export type PermitApprovalAndSignature = {
    permitApproval: PermitApproval;
    permitSignature: Hex;
};

export type PermitBatchAndSignatures = {
    permitBatch: PermitApproval[];
    permitSignatures: Hex[];
};

/**
 * Signs a permit for a given ERC-2612 ERC20 token using the specified parameters.
 *
 * @param { Client & WalletActions & PublicActions } client - Wallet client to invoke for signing the permit message
 */
export const signPermit = async (
    client: Client & WalletActions & PublicActions,
    token: Hex,
    owner: Hex,
    spender: Hex,
    amount = MAX_UINT256,
    nonce?: bigint,
    deadline = MAX_UINT256,
): Promise<{
    permitApproval: PermitApproval;
    permitSignature: Hex;
}> => {
    const types = {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    };

    const _nonce = nonce ?? (await getNonce(client, token, owner));
    const message = {
        owner,
        spender,
        value: amount,
        nonce: _nonce,
        deadline,
    };

    const domain = await getDomain(client, token);
    const permitSignature = await client.signTypedData({
        account: owner,
        message,
        domain,
        primaryType: 'Permit',
        types,
    });
    const permitApproval = {
        token,
        owner,
        spender,
        amount,
        nonce: _nonce,
        deadline,
    };
    return { permitApproval, permitSignature };
};

const getDomain = async (
    client: Client & WalletActions & PublicActions,
    token: Hex,
) => {
    const [, name, version, chainId, verifyingContract, , ,] =
        await client.readContract({
            abi: weightedPoolAbi_V3,
            address: token,
            functionName: 'eip712Domain',
            args: [],
        });

    const domain = {
        name,
        version,
        chainId: Number(chainId),
        verifyingContract,
    };

    return domain;
};
