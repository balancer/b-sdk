import { Address } from 'viem';
import { writeFileSync } from 'fs';
import { sonic } from 'viem/chains';

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
    'Authorizer', // only ABI?
    // 'BatchRelayer', // Named "BatchRelayerLibrary" in SDK. TODO: investigate https://github.com/balancer/balancer-deployments/tree/master/v2/tasks/20231031-batch-relayer-v6
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
    'StableSurgePoolFactory',
    'GyroECLPPoolFactory',
    'LBPoolFactory',
];

const targetContracts = [...targetContractsV2, ...targetContractsV3];

const balancerV2Contracts: ContractRegistry = {};
const balancerV3Contracts: ContractRegistry = {};

export async function updateBalancerDeployments() {
    // Fetch all the networks we support
    const res = await fetch(
        'https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/.supported-networks.json',
    );
    const data: Record<string, SupportedNetworkResponse> = await res.json();

    const supportedNetworks = Object.entries(data).map(
        ([name, { chainId }]) => ({
            name,
            chainId,
            deploymentsUrl: `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/${name}.json`,
        }),
    );

    // Manually add sonic since it live in seperate beets org repo
    supportedNetworks.push({
        name: 'sonic',
        chainId: sonic.id,
        deploymentsUrl:
            'https://raw.githubusercontent.com/beethovenxfi/balancer-deployments/refs/heads/master/addresses/sonic.json',
    });

    // Fetch all the addresses for each network we support
    await Promise.all(
        supportedNetworks.map(
            async ({ name: networkName, chainId, deploymentsUrl }) => {
                const res = await fetch(deploymentsUrl);
                if (!res.ok)
                    throw new Error(
                        `Failed to fetch network data for ${networkName}`,
                    );

                const data: NetworkRegistryResponse = await res.json();

                await Promise.all(
                    Object.entries(data)
                        .filter(([_, value]) => value.status === 'ACTIVE')
                        .map(async ([taskId, value]) => {
                            const { version } = value;

                            // Filter to only grab the contracts SDK uses
                            await Promise.all(
                                value.contracts
                                    .filter((contract) =>
                                        targetContracts.includes(contract.name),
                                    )
                                    .map(async (contract) => {
                                        const { name } = contract;

                                        if (version === 'v2') {
                                            if (!balancerV2Contracts[name])
                                                balancerV2Contracts[name] = {};
                                            balancerV2Contracts[name][chainId] =
                                                contract.address;
                                        }
                                        if (version === 'v3') {
                                            if (!balancerV3Contracts[name])
                                                balancerV3Contracts[name] = {};
                                            balancerV3Contracts[name][chainId] =
                                                contract.address;
                                        }

                                        // grab contract abis using only mainnet to avoid redundant requests
                                        if (networkName === 'mainnet') {
                                            const url = `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/${version}/tasks/${taskId}/artifact/${contract.name}.json`;
                                            const res = await fetch(url);
                                            if (!res.ok) {
                                                throw new Error(
                                                    `Failed to fetch ABI for ${contract.name}: ${res.status} ${res.statusText}`,
                                                );
                                            }
                                            const data: AbiResponse =
                                                await res.json();

                                            const contractName =
                                                contract.name
                                                    .charAt(0)
                                                    .toLowerCase() +
                                                contract.name.slice(1);
                                            const content = `export const ${contractName}Abi = ${JSON.stringify(
                                                data.abi,
                                                undefined,
                                                4,
                                            )} as const;`;
                                            const path = `./src/abi/${version}/${contractName}.ts`;
                                            writeFileSync(path, content);
                                        }
                                    }),
                            );
                        }),
                );
            },
        ),
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
}

updateBalancerDeployments();
