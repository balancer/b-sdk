import { Address, TypedData, TypedDataDomain, hashTypedData } from 'viem';

import {
    MaxSigDeadline,
    MaxOrderedNonce,
    MaxAllowanceTransferAmount,
    MaxAllowanceExpiration,
} from './constants';
import { permit2Domain } from './domain';

export interface PermitDetails {
    token: Address;
    amount: bigint;
    expiration: number;
    nonce: number;
}

export interface PermitSingle {
    details: PermitDetails;
    spender: Address;
    sigDeadline: bigint;
}

export interface Permit2Batch {
    details: PermitDetails[];
    spender: Address;
    sigDeadline: bigint;
}

export type PermitSingleData = {
    domain: TypedDataDomain;
    types: TypedData;
    values: PermitSingle;
};

export type PermitBatchData = {
    domain: TypedDataDomain;
    types: TypedData;
    values: Permit2Batch;
};

const PERMIT_DETAILS = [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' },
] as const;

const PERMIT_TYPES = {
    PermitDetails: PERMIT_DETAILS,
    PermitSingle: [
        { name: 'details', type: 'PermitDetails' },
        { name: 'spender', type: 'address' },
        { name: 'sigDeadline', type: 'uint256' },
    ],
} as const;

const PERMIT_BATCH_TYPES = {
    PermitDetails: PERMIT_DETAILS,
    PermitBatch: [
        { name: 'details', type: 'PermitDetails[]' },
        { name: 'spender', type: 'address' },
        { name: 'sigDeadline', type: 'uint256' },
    ],
} as const;

function isPermit(permit: PermitSingle | Permit2Batch): permit is PermitSingle {
    return !Array.isArray(permit.details);
}

export abstract class AllowanceTransfer {
    /**
     * Cannot be constructed.
     */
    private constructor() {}

    // return the data to be sent in a eth_signTypedData RPC call
    // for signing the given permit data
    public static getPermitSingleData(
        permit: PermitSingle,
        permit2Address: Address,
        chainId: number,
    ) {
        if (permit.sigDeadline > MaxSigDeadline) {
            throw new Error('SIG_DEADLINE_OUT_OF_RANGE');
        }

        const domain = permit2Domain(permit2Address, chainId);
        validatePermitDetails(permit.details);

        return {
            domain,
            values: permit,
        };
    }

    // return the data to be sent in a eth_signTypedData RPC call
    // for signing the given permit data
    public static getPermitBatchData(
        permit: Permit2Batch,
        permit2Address: Address,
        chainId: number,
    ) {
        if (permit.sigDeadline > MaxSigDeadline) {
            throw new Error('SIG_DEADLINE_OUT_OF_RANGE');
        }

        const domain = permit2Domain(permit2Address, chainId);
        permit.details.forEach(validatePermitDetails);

        return {
            domain,
            values: permit,
        };
    }

    // return the data to be sent in a eth_signTypedData RPC call
    // for signing the given permit data
    public static getPermitData(
        permit: PermitSingle | Permit2Batch,
        permit2Address: Address,
        chainId: number,
    ): PermitSingleData | PermitBatchData {
        if (permit.sigDeadline > MaxSigDeadline) {
            throw new Error('SIG_DEADLINE_OUT_OF_RANGE');
        }

        const domain = permit2Domain(permit2Address, chainId);
        if (isPermit(permit)) {
            validatePermitDetails(permit.details);
            return {
                domain,
                types: PERMIT_TYPES,
                values: permit,
            };
            // biome-ignore lint/style/noUselessElse: <explanation>
        } else {
            permit.details.forEach(validatePermitDetails);
            return {
                domain,
                types: PERMIT_BATCH_TYPES,
                values: permit,
            };
        }
    }

    public static hash(
        permit: PermitSingle | Permit2Batch,
        permit2Address: Address,
        chainId: number,
    ): string {
        if (isPermit(permit)) {
            const { domain, values } = AllowanceTransfer.getPermitSingleData(
                permit,
                permit2Address,
                chainId,
            );

            return hashTypedData({
                domain,
                types: PERMIT_TYPES,
                primaryType: 'PermitSingle',
                message: values,
            });
            // biome-ignore lint/style/noUselessElse: <explanation>
        } else {
            const { domain, values } = AllowanceTransfer.getPermitBatchData(
                permit,
                permit2Address,
                chainId,
            );

            return hashTypedData({
                domain,
                types: PERMIT_BATCH_TYPES,
                primaryType: 'PermitBatch',
                message: values,
            });
        }
    }
}

function validatePermitDetails(details: PermitDetails) {
    if (details.nonce > MaxOrderedNonce) {
        throw new Error('NONCE_OUT_OF_RANGE');
    }
    if (details.amount > MaxAllowanceTransferAmount) {
        throw new Error('AMOUNT_OUT_OF_RANGE');
    }
    if (details.expiration > MaxAllowanceExpiration) {
        throw new Error('EXPIRATION_OUT_OF_RANGE');
    }
}
