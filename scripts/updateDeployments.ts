import { Address } from 'viem';
import { writeFileSync } from 'fs';

type SupportedNetworkResponse = {
    name: string;
    chainId: number;
    blockExplorer: string;
};

type NetworkRegistryResponse = {
    [key: string]: {
        contracts: { name: string; address: Address }[];
        status: 'ACTIVE' | 'DEPRECATED' | 'SCRIPT';
        version: 'v2' | 'v3';
    };
};

type AbiResponse = {
    abi: any[];
};

// {v2: {contractName: {chainId: address, ...}, v3: {contractName: {chainId: address, ...}}}
type ContractRegistry = {
    [key: string]: {
        [key: string]: {
            [key: string]: Address;
        };
    };
};

const targetContractsV3 = ['Vault', 'VaultAdmin', 'Router'];

export async function updateDeployments() {
    const res = await fetch(
        'https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/.supported-networks.json',
    );
    const data: Record<string, SupportedNetworkResponse> = await res.json();

    const supportedNetworks = Object.entries(data).map(
        ([name, { chainId }]) => ({ name, chainId }),
    );

    const contractRegistry: ContractRegistry = {};

    await Promise.all(
        supportedNetworks.map(async ({ name: networkName, chainId }) => {
            const url = `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/${networkName}.json`;
            const res = await fetch(url);
            const data: NetworkRegistryResponse = await res.json();

            Object.entries(data)
                .filter(([_, value]) => value.status === 'ACTIVE')
                .forEach(([taskId, value]) => {
                    const { version } = value;

                    value.contracts.map(async (contract) => {
                        // update the contract registry
                        if (!contractRegistry[version]) {
                            contractRegistry[version] = {};
                        }
                        if (!contractRegistry[version][contract.name]) {
                            contractRegistry[version][contract.name] = {};
                        }
                        contractRegistry[value.version][contract.name][
                            chainId
                        ] = contract.address;

                        // grab contract abis
                        if (
                            version === 'v3' &&
                            networkName === 'mainnet' &&
                            targetContractsV3.includes(contract.name)
                        ) {
                            const url = `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/v3/tasks/${taskId}/artifact/${contract.name}.json`;
                            const res = await fetch(url);
                            const data: AbiResponse = await res.json();

                            const content = `export const ${
                                contract.name
                            }Abi = ${JSON.stringify(
                                data.abi,
                                undefined,
                                4,
                            )} as const;`;

                            const path = `./src/abi/${value.version}/${contract.name}.ts`;
                            writeFileSync(path, content);
                        }
                    });
                });
        }),
    );

    // save contract registry to balancerContracts.ts
    const content = `export const balancerContracts = ${JSON.stringify(
        contractRegistry,
        undefined,
        4,
    )} as const;`;
    writeFileSync('./src/utils/balancerContracts.ts', content);
}

updateDeployments();
