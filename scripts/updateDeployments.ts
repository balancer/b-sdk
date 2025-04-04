import { Address } from 'viem';
import { writeFileSync } from 'fs';

type SupportedNetworkResponse = {
    name: string;
    chainId: number;
    blockExplorer: string;
};

type NetworkRegistry = {
    [key: string]: {
        contracts: { name: string; address: Address }[];
        status: 'ACTIVE' | 'DEPRECATED' | 'SCRIPT';
        version: 'v2' | 'v3';
    };
};

// {v2: {contractName: {chainId: address, ...}, v3: {contractName: {chainId: address, ...}}}
export type ContractRegistry = {
    [key: string]: {
        [key: string]: {
            [key: string]: Address;
        };
    };
};

export async function updateDeployments() {
    const res = await fetch(
        'https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/.supported-networks.json',
    );

    const data: Record<string, SupportedNetworkResponse> = await res.json();

    const supportedNetworks = Object.entries(data).map(
        ([name, { chainId }]) => ({ name, chainId }),
    );

    const contractRegistry: ContractRegistry = { v2: {}, v3: {} };

    await Promise.all(
        supportedNetworks.map(async ({ name, chainId }) => {
            const res = await fetch(
                `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/${name}.json`,
            );

            const data: NetworkRegistry = await res.json();

            Object.entries(data)
                .filter(([_, value]) => value.status === 'ACTIVE')
                .forEach(([_, value]) => {
                    // Process all contracts under this version
                    value.contracts.forEach((contract) => {
                        // Initialize version object if it doesn't exist
                        if (!contractRegistry[value.version]) {
                            contractRegistry[value.version] = {};
                        }
                        // Initialize contract object if it doesn't exist under this version
                        if (!contractRegistry[value.version][contract.name]) {
                            contractRegistry[value.version][contract.name] = {};
                        }
                        // Add the address
                        contractRegistry[value.version][contract.name][
                            chainId
                        ] = contract.address;
                    });
                });
        }),
    );

    const content = `export const balancerContracts = ${JSON.stringify(
        contractRegistry,
        undefined,
        4,
    )} as const;`;

    writeFileSync('./src/utils/balancerContracts.ts', content);
}

updateDeployments();
