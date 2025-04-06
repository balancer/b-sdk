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

// {contractName: {chainId: address}, ...}
type ContractRegistry = {
    [key: string]: {
        [key: string]: Address;
    };
};

const targetContractsV2 = [
    'Vault',
    'BalancerRelayer',
    'BalancerQueries',
    'WeightedPoolFactory',
    'ComposableStablePoolFactory',
];

const targetContractsV3 = [
    'Vault',
    'VaultAdmin',
    'VaultExtension',
    'Router',
    'BatchRouter',
    'CompositeLiquidityRouter',
    'BufferRouter',
    'WeightedPoolFactory',
    'StablePoolFactory',
    'GyroECLPPoolFactory',
    'LBPoolFactory',
];

const targetContracts = [...targetContractsV2, ...targetContractsV3];

export async function updateDeployments() {
    const res = await fetch(
        'https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/.supported-networks.json',
    );
    const data: Record<string, SupportedNetworkResponse> = await res.json();

    const supportedNetworks = Object.entries(data).map(
        ([name, { chainId }]) => ({ name, chainId }),
    );

    const balancerV2Contracts: ContractRegistry = {};
    const balancerV3Contracts: ContractRegistry = {};

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
                        if (version === 'v2') {
                            if (!balancerV2Contracts[contract.name]) {
                                balancerV2Contracts[contract.name] = {};
                            }
                            balancerV2Contracts[contract.name][chainId] =
                                contract.address;
                        }

                        if (version === 'v3') {
                            if (!balancerV3Contracts[contract.name]) {
                                balancerV3Contracts[contract.name] = {};
                            }
                            balancerV3Contracts[contract.name][chainId] =
                                contract.address;
                        }

                        // grab contract abis
                        if (
                            networkName === 'mainnet' &&
                            targetContracts.includes(contract.name)
                        ) {
                            const url = `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/${version}/tasks/${taskId}/artifact/${contract.name}.json`;
                            const res = await fetch(url);
                            const data: AbiResponse = await res.json();

                            const content = `export const ${
                                contract.name
                            }Abi = ${JSON.stringify(
                                data.abi,
                                undefined,
                                4,
                            )} as const;`;

                            const path = `./src/abi/${version}/${contract.name}.ts`;
                            writeFileSync(path, content);
                        }
                    });
                });
        }),
    );

    const balancerV2Content = `export const balancerV2Contracts = ${JSON.stringify(
        balancerV2Contracts,
        undefined,
        4,
    )} as const;`;
    writeFileSync('./src/utils/balancerV2Contracts.ts', balancerV2Content);

    const balancerV3Content = `export const balancerV3Contracts = ${JSON.stringify(
        balancerV3Contracts,
        undefined,
        4,
    )} as const;`;
    writeFileSync('./src/utils/balancerV3Contracts.ts', balancerV3Content);
}

updateDeployments();
