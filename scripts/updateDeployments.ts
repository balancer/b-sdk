import { Abi, Address } from 'viem';
import { writeFileSync, readFileSync } from 'node:fs';
import { sonic } from 'viem/chains';
import { ChainId, PERMIT2 } from '../src/utils/constants';

type SupportedNetworkResponse = {
    name: string;
    chainId: number;
    blockExplorer: string;
};

type SupportedNetwork = {
    networkName: string;
    chainId: number;
    deploymentsUrl: string;
};

type NetworkRegistryResponse = {
    [key: string]: {
        contracts: { name: string; address: Address }[];
        status: 'ACTIVE' | 'DEPRECATED' | 'SCRIPT';
        version: 'v2' | 'v3';
    };
};

type AbiResponse = {
    abi: Abi[];
};

// {contractName: {chainId: address}, ...}
type ContractRegistry = {
    [key: string]: {
        [key: string]: Address;
    };
};

// Create a map that looks like ['1': '[ChainId.MAINNET]', '10': '[ChainId.OPTIMISM]', ...]
const chainIdToHumanKey = Object.fromEntries(
    Object.entries(ChainId)
        .filter(([key]) => Number.isNaN(Number(key))) // Filter out numeric keys (enum values)
        .map(([key, value]) => [value, `[ChainId.${key}]`]),
);

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
    'ReClammPoolFactory',
    'MockGyroEclpPool',
    'LBPMigrationRouter',
];

const targetContracts = [...targetContractsV2, ...targetContractsV3];

const balancerV2Contracts: ContractRegistry = {};
const balancerV3Contracts: ContractRegistry = {};

const branch = 'master'; // point this at any balancer-deployments branch

async function updateBalancerDeployments() {
    const supportedNetworks = await fetchSupportedNetworks();
    await processContractData(supportedNetworks);
    updateContractAddresses();
    exportAbis();
}

async function fetchSupportedNetworks(): Promise<SupportedNetwork[]> {
    // Fetch all the networks we support
    const res = await fetch(
        `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/${branch}/addresses/.supported-networks.json`,
    );
    const data: Record<string, SupportedNetworkResponse> = await res.json();

    const supportedNetworks = Object.entries(data).map(
        ([name, { chainId }]) => ({
            networkName: name,
            chainId,
            deploymentsUrl: `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/${branch}/addresses/${name}.json`,
        }),
    );

    // Manually add sonic since it live in seperate beets org repo
    supportedNetworks.push({
        networkName: 'sonic',
        chainId: sonic.id,
        deploymentsUrl:
            'https://raw.githubusercontent.com/beethovenxfi/balancer-deployments/refs/heads/master/addresses/sonic.json',
    });

    supportedNetworks.sort((a, b) =>
        a.networkName.localeCompare(b.networkName),
    );

    return supportedNetworks;
}

async function processContractData(supportedNetworks: SupportedNetwork[]) {
    const permit2Updates: Record<string, Address> = {};
    const PERMIT2_ADDRESS: Address =
        '0x000000000022D473030F116dDEE9F6B43aC78BA3';

    // Process each network sequentially to maintain consistent order
    for (const { networkName, chainId, deploymentsUrl } of supportedNetworks) {
        const res = await fetch(deploymentsUrl);
        if (!res.ok) {
            throw new Error(`Failed to fetch network data for ${networkName}`);
        }

        const data: NetworkRegistryResponse = await res.json();

        // Process each task sequentially to maintain consistent order
        for (const [taskId, value] of Object.entries(data)) {
            if (value.status !== 'ACTIVE') continue;
            const { version } = value;

            for (const contract of value.contracts) {
                if (!targetContracts.includes(contract.name)) continue;

                const { name } = contract;

                if (version === 'v2') {
                    if (!balancerV2Contracts[name])
                        balancerV2Contracts[name] = {};
                    balancerV2Contracts[name][chainIdToHumanKey[chainId]] =
                        contract.address;
                }
                if (version === 'v3') {
                    if (!balancerV3Contracts[name])
                        balancerV3Contracts[name] = {};
                    balancerV3Contracts[name][chainIdToHumanKey[chainId]] =
                        contract.address;
                }

                // Grab contract ABIs using only sepolia, which should include all contracts right? we wouldnt deploy to prod w/o sepolia test right?
                if (networkName === 'sepolia' && version === 'v3') {
                    const url = `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/${branch}/${version}/tasks/${taskId}/artifact/${contract.name}.json`;
                    const res = await fetch(url);
                    if (!res.ok) {
                        throw new Error(
                            `Failed to fetch ABI for ${contract.name}: ${res.status} ${res.statusText}`,
                        );
                    }
                    const data: AbiResponse = await res.json();

                    const contractName =
                        contract.name.charAt(0).toLowerCase() +
                        contract.name.slice(1);
                    const content = `export const ${contractName}Abi_${version.toUpperCase()} = ${JSON.stringify(
                        data.abi,
                        undefined,
                        4,
                    )} as const;`;
                    const path = `./src/abi/${version}/${contractName}.ts`;
                    writeFileSync(path, content);
                }
            }
        }

        // Check if PERMIT2 entry exists for current chainId
        const chainKey = chainIdToHumanKey[chainId];
        if (chainKey && !PERMIT2[chainId]) {
            // no entry exists yet, possibility to add it
            // TODO: Verify that at the deployed address is
            // actually Permit2 code

            permit2Updates[chainKey] = PERMIT2_ADDRESS;
        }

        // write the update to the constants ts file
    }

    // Update PERMIT2 addresses if needed
    updatePermit2Addresses(permit2Updates);
}

// Add this function that matches the style of updateContractAddresses
function updatePermit2Addresses(permit2Updates: Record<string, Address>) {
    if (Object.keys(permit2Updates).length === 0) {
        return; // No updates needed
    }

    // Read the current constants file
    const constantsPath = './src/utils/constants.ts';
    let constantsContent = readFileSync(constantsPath, 'utf-8');

    // Find the existing PERMIT2 object
    const permit2Regex =
        /(export const PERMIT2: Record<number, Address> = \{)([\s\S]*?)(\};)/;
    const permit2Match = constantsContent.match(permit2Regex);

    if (!permit2Match) {
        throw new Error('Could not find PERMIT2 object in constants file');
    }

    // Parse existing entries
    const existingContent = permit2Match[2];
    const existingPermit2: Record<string, Address> = {};

    // Extract existing entries
    const entryRegex = /(\[ChainId\.[A-Z_]+\]):\s*'([^']+)'/g;
    let match;
    while ((match = entryRegex.exec(existingContent)) !== null) {
        existingPermit2[match[1]] = match[2] as Address;
    }

    // Merge with updates (updates take precedence)
    const mergedPermit2 = { ...existingPermit2, ...permit2Updates };

    // Sort by key for consistent ordering (matching updateContractAddresses style)
    const sortedPermit2 = Object.fromEntries(
        Object.entries(mergedPermit2).sort(([a], [b]) => a.localeCompare(b)),
    );

    // Generate the updated PERMIT2 content
    const permit2Content = JSON.stringify(sortedPermit2, undefined, 4).replace(
        /"(\[ChainId\.[A-Z_]+\])"/g,
        '$1',
    ); // Remove quotes from ChainId keys

    // Replace the PERMIT2 object in the constants file
    const updatedConstants = constantsContent.replace(
        permit2Regex,
        `$1 ${permit2Content.slice(1, -1)} $3`, // Remove outer braces from JSON
    );

    writeFileSync(constantsPath, updatedConstants);
    console.log(
        `Updated PERMIT2 with ${Object.keys(permit2Updates).length} entries`,
    );
}

function updateContractAddresses() {
    // Sort the contracts by name for easier PR reviews
    const sortedV2Contracts = Object.fromEntries(
        Object.entries(balancerV2Contracts).sort(([a], [b]) =>
            a.localeCompare(b),
        ),
    );
    const sortedV3Contracts = Object.fromEntries(
        Object.entries(balancerV3Contracts).sort(([a], [b]) =>
            a.localeCompare(b),
        ),
    );

    // Import ChainId to make the keys human readable
    const chainIdImport = `import {ChainId} from "@/utils/constants";\n\n`;

    // Write the contract addresses to the utils files
    const balancerV2Content =
        `${chainIdImport} export const balancerV2Contracts = ${JSON.stringify(
            sortedV2Contracts,
            undefined,
            4,
        )} as const;`.replace(/"(\[ChainId\.[A-Z_]+\])"/g, '$1');
    writeFileSync('./src/utils/balancerV2Contracts.ts', balancerV2Content);

    const balancerV3Content =
        `${chainIdImport} export const balancerV3Contracts = ${JSON.stringify(
            sortedV3Contracts,
            undefined,
            4,
        )} as const;`.replace(/"(\[ChainId\.[A-Z_]+\])"/g, '$1');
    writeFileSync('./src/utils/balancerV3Contracts.ts', balancerV3Content);
}

function exportAbis() {
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
