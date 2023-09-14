import { Address } from '../../types';

// Returned from API and used as input
export type PoolState = {
    id: Address;
    address: Address;
    type: string;
    tokens: {
        address: Address;
        decimals: number;
    }[]; // already properly sorted in case different versions sort them differently
};
