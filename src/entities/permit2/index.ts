import { Address, Hex } from '@/types';
import { Client, PublicActions, WalletActions } from 'viem';
import {
    AllowanceTransfer,
    Permit2Batch,
    PermitDetails,
} from './allowanceTransfer';
import { AllowanceProvider } from './providers';
import { PERMIT2 } from '@/utils';
import {
    MaxAllowanceExpiration,
    MaxAllowanceTransferAmount,
    MaxSigDeadline,
} from './constants';

export * from './allowanceTransfer';
export * from './signatureTransfer';
export * from './providers';
export * from './constants';

export const signPermit2 = async (
    client: Client & WalletActions & PublicActions,
    owner: Address,
    spender: Address,
    details: PermitDetails[],
    sigDeadline = MaxSigDeadline,
): Promise<{
    permit2Batch: Permit2Batch;
    permit2Signature: Hex;
}> => {
    const permit2Batch: Permit2Batch = {
        details,
        spender,
        sigDeadline,
    };

    const chainId = await client.getChainId();
    const { domain, types, values } = AllowanceTransfer.getPermitData(
        permit2Batch,
        PERMIT2[chainId],
        chainId,
    );

    const permit2Signature = await client.signTypedData({
        account: owner,
        message: {
            ...values,
        },
        domain,
        primaryType: 'PermitBatch',
        types,
    });
    return { permit2Batch, permit2Signature };
};

export const getDetails = async (
    client: Client & PublicActions,
    token: Address,
    owner: Address,
    spender: Address,
    amount = MaxAllowanceTransferAmount,
    expiration = Number(MaxAllowanceExpiration),
    nonce?: number,
) => {
    let _nonce: number;
    if (nonce === undefined) {
        const chainId = await client.getChainId();
        const provider = new AllowanceProvider(client, PERMIT2[chainId]);
        _nonce = await provider.getNonce(token, owner, spender);
    } else {
        _nonce = nonce;
    }
    const details: PermitDetails = {
        token,
        amount,
        expiration,
        nonce: _nonce,
    };

    return details;
};
