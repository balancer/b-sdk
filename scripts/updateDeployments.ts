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

// Update this list to add new contracts
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
    try {
        // Fetch all the networks we support
        const res = await fetch(
            'https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/.supported-networks.json',
        );
        const data: Record<string, SupportedNetworkResponse> = await res.json();

        const supportedNetworks = Object.entries(data).map(
            ([name, { chainId }]) => ({ name, chainId }),
        );

        const balancerV2Contracts: ContractRegistry = {};
        const balancerV3Contracts: ContractRegistry = {};

        // Fetch all the addresses for each network we support
        await Promise.all(
            supportedNetworks.map(async ({ name: networkName, chainId }) => {
                const url = `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/${networkName}.json`;
                const res = await fetch(url);
                const data: NetworkRegistryResponse = await res.json();

                Object.entries(data)
                    .filter(([_, value]) => value.status === 'ACTIVE')
                    .forEach(([taskId, value]) => {
                        const { version } = value;

                        // Filter to only grab the contracts SDK uses
                        value.contracts
                            .filter((contract) =>
                                targetContracts.includes(contract.name),
                            )
                            .map(async (contract) => {
                                if (version === 'v2') {
                                    if (!balancerV2Contracts[contract.name])
                                        balancerV2Contracts[contract.name] = {};
                                    balancerV2Contracts[contract.name][
                                        chainId
                                    ] = contract.address;
                                }
                                if (version === 'v3') {
                                    if (!balancerV3Contracts[contract.name])
                                        balancerV3Contracts[contract.name] = {};
                                    balancerV3Contracts[contract.name][
                                        chainId
                                    ] = contract.address;
                                }

                                // grab contract abis using only mainnet to avoid redundant requests
                                if (networkName === 'mainnet') {
                                    const url = `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/${version}/tasks/${taskId}/artifact/${contract.name}.json`;
                                    const res = await fetch(url);
                                    const data: AbiResponse = await res.json();

                                    const contractName =
                                        contract.name.charAt(0).toLowerCase() +
                                        contract.name.slice(1);

                                    const content = `export const ${contractName}Abi = ${JSON.stringify(
                                        data.abi,
                                        undefined,
                                        4,
                                    )} as const;`;

                                    const path = `./src/abi/${version}/${contractName}.ts`;
                                    writeFileSync(path, content);
                                }
                            });
                    });
            }),
        );

        // Write the contract addresses to the utils files
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

        // Export all the abis
        const exportAbisV2 = targetContractsV2.map(
            (contract) =>
                `export * from './${
                    contract[0].toLowerCase() + contract.slice(1)
                }';`,
        );
        const exportAbisV3 = targetContractsV3.map(
            (contract) =>
                `export * from './${
                    contract[0].toLowerCase() + contract.slice(1)
                }';`,
        );
        writeFileSync('./src/abi/v2/index.ts', exportAbisV2.join('\n'));
        writeFileSync('./src/abi/v3/index.ts', exportAbisV3.join('\n'));
    } catch (error) {
        console.error('Failed to update deployments:', error);
        throw error; // Re-throw to ensure the process exits with an error code
    }
}

updateDeployments();
