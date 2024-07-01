import invariant from 'tiny-invariant';
import { Address, TypedData, TypedDataDomain, hashTypedData } from 'viem';

import { permit2Domain } from './domain';

import {
    MaxSigDeadline,
    MaxUnorderedNonce,
    MaxSignatureTransferAmount,
} from './constants';

export interface Witness {
    witness: any;
    witnessTypeName: string;
    witnessType: TypedData;
}

export interface TokenPermissions {
    token: Address;
    amount: bigint;
}

export interface PermitTransferFrom {
    permitted: TokenPermissions;
    spender: Address;
    nonce: bigint;
    deadline: bigint;
}

export interface PermitBatchTransferFrom {
    permitted: TokenPermissions[];
    spender: Address;
    nonce: bigint;
    deadline: bigint;
}

export type PermitTransferFromData = {
    domain: TypedDataDomain;
    types: TypedData;
    values: PermitTransferFrom;
};

export type PermitBatchTransferFromData = {
    domain: TypedDataDomain;
    types: TypedData;
    values: PermitBatchTransferFrom;
};

const TOKEN_PERMISSIONS = [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
] as const;

const PERMIT_TRANSFER_FROM_TYPES = {
    TokenPermissions: TOKEN_PERMISSIONS,
    PermitTransferFrom: [
        { name: 'permitted', type: 'TokenPermissions' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
    ],
} as const;

const PERMIT_BATCH_TRANSFER_FROM_TYPES = {
    TokenPermissions: TOKEN_PERMISSIONS,
    PermitBatchTransferFrom: [
        { name: 'permitted', type: 'TokenPermissions[]' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
    ],
} as const;

function isPermitTransferFrom(
    permit: PermitTransferFrom | PermitBatchTransferFrom,
): permit is PermitTransferFrom {
    return !Array.isArray(permit.permitted);
}

export abstract class SignatureTransfer {
    /**
     * Cannot be constructed.
     */
    private constructor() {}

    public static getPermitTransferData(
        permit: PermitTransferFrom,
        permit2Address: Address,
        chainId: number,
    ) {
        invariant(
            MaxSigDeadline >= permit.deadline,
            'SIG_DEADLINE_OUT_OF_RANGE',
        );
        invariant(MaxUnorderedNonce >= permit.nonce, 'NONCE_OUT_OF_RANGE');

        const domain = permit2Domain(permit2Address, chainId);

        validateTokenPermissions(permit.permitted);

        return {
            domain,
            types: PERMIT_TRANSFER_FROM_TYPES,
            values: permit,
        };
    }

    public static getPermitBatchTransferData(
        permit: PermitBatchTransferFrom,
        permit2Address: Address,
        chainId: number,
    ) {
        invariant(
            MaxSigDeadline >= permit.deadline,
            'SIG_DEADLINE_OUT_OF_RANGE',
        );
        invariant(MaxUnorderedNonce >= permit.nonce, 'NONCE_OUT_OF_RANGE');

        const domain = permit2Domain(permit2Address, chainId);

        permit.permitted.forEach(validateTokenPermissions);

        return {
            domain,
            types: PERMIT_BATCH_TRANSFER_FROM_TYPES,
            values: permit,
        };
    }

    // return the data to be sent in a eth_signTypedData RPC call
    // for signing the given permit data
    public static getPermitData(
        permit: PermitTransferFrom | PermitBatchTransferFrom,
        permit2Address: Address,
        chainId: number,
        _witness?: Witness,
    ): PermitTransferFromData | PermitBatchTransferFromData {
        if (isPermitTransferFrom(permit)) {
            // biome-ignore lint/complexity/noThisInStatic: <explanation>
            return this.getPermitTransferData(permit, permit2Address, chainId);
        }
        // biome-ignore lint/complexity/noThisInStatic: <explanation>
        return this.getPermitBatchTransferData(permit, permit2Address, chainId);
    }

    public static hash(
        permit: PermitTransferFrom | PermitBatchTransferFrom,
        permit2Address: Address,
        chainId: number,
        _witness?: Witness,
    ): string {
        if (isPermitTransferFrom(permit)) {
            const { domain, types, values } =
                SignatureTransfer.getPermitTransferData(
                    permit,
                    permit2Address,
                    chainId,
                );

            return hashTypedData({
                domain,
                types,
                primaryType: 'PermitTransferFrom',
                message: values,
            });
            // biome-ignore lint/style/noUselessElse: <explanation>
        } else {
            const { domain, types, values } =
                SignatureTransfer.getPermitBatchTransferData(
                    permit,
                    permit2Address,
                    chainId,
                );

            return hashTypedData({
                domain,
                types,
                primaryType: 'PermitBatchTransferFrom',
                message: values,
            });
        }
    }
}

function validateTokenPermissions(permissions: TokenPermissions) {
    invariant(
        MaxSignatureTransferAmount >= permissions.amount,
        'AMOUNT_OUT_OF_RANGE',
    );
}
