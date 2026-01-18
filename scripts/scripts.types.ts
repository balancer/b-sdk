import { Address, Abi } from 'viem';

export type SupportedNetworkResponse = {
    name: string;
    chainId: number;
    blockExplorer: string;
};

export type SupportedNetwork = {
    networkName: string;
    chainId: number;
    deploymentsUrl: string;
};

export type NetworkRegistryResponse = {
    [key: string]: {
        contracts: { name: string; address: Address }[];
        status: 'ACTIVE' | 'DEPRECATED' | 'SCRIPT';
        version: 'v2' | 'v3';
    };
};

export type AbiResponse = {
    abi: Abi[];
};

// {contractName: {chainId: address}, ...}
export type ContractRegistry = {
    [key: string]: {
        [key: string]: Address;
    };
};
