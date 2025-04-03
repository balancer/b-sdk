import { Address } from 'viem';
import { readFileSync, writeFileSync } from 'fs';

type NetworkInfo = {
    name: string;
    chainId: number;
    blockExplorer: string;
};

type AddressRegistryData = {
    [key: string]: {
        contracts: { name: string; address: Address }[];
        status: 'ACTIVE' | 'DEPRECATED' | 'SCRIPT';
        version: 'v2' | 'v3';
    };
};

// contractName: {chainId: address}
type ContractRegistry = {
    [key: string]: {
        [key: string]: Address;
    };
};

export async function updateDeployments() {
    const res = await fetch(
        'https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/.supported-networks.json',
    );

    const data: Record<string, NetworkInfo> = await res.json();

    const supportedNetworks = Object.entries(data).map(
        ([name, { chainId }]) => ({ name, chainId }),
    );

    const contractRegistry: ContractRegistry = {};

    await Promise.all(
        supportedNetworks.map(async ({ name, chainId }) => {
            const res = await fetch(
                `https://raw.githubusercontent.com/balancer/balancer-deployments/refs/heads/master/addresses/${name}.json`,
            );

            const data: AddressRegistryData = await res.json();

            Object.entries(data)
                .filter(
                    ([_, value]) =>
                        value.status === 'ACTIVE' && value.version === 'v3',
                )
                .flatMap(([_, value]) => value.contracts)
                .forEach((contract) => {
                    if (!contractRegistry[contract.name]) {
                        contractRegistry[contract.name] = {};
                    }
                    contractRegistry[contract.name][chainId] = contract.address;
                });
        }),
    );

    const constantsV3 = './src/utils/constantsV3.ts';
    let content = readFileSync(constantsV3, 'utf8');

    const deploymentToSdkName = {
        Vault: 'VAULT_V3',
        VaultAdmin: 'VAULT_ADMIN',
        // Routers
        Router: 'BALANCER_ROUTER',
        BatchRouter: 'BALANCER_BATCH_ROUTER',
        CompositeLiquidityRouter: 'BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED', // boosted is only one 'ACTIVE' ?
        BufferRouter: 'BALANCER_BUFFER_ROUTER',
        // Factories
        WeightedPoolFactory: 'WEIGHTED_POOL_FACTORY_BALANCER_V3',
        StablePoolFactory: 'STABLE_POOL_FACTORY_BALANCER_V3',
        StableSurgePoolFactory: 'STABLE_SURGE_FACTORY',
        GyroECLPPoolFactory: 'GYROECLP_POOL_FACTORY_BALANCER_V3',
        Gyro2CLPPoolFactory: 'GYRO2CLP_POOL_FACTORY_BALANCER_V3',
        // Add more as needed...
    };

    Object.entries(deploymentToSdkName).forEach(([deploymentName, sdkName]) => {
        const contractExists = content.includes(`export const ${sdkName}`);

        if (contractExists) {
            // Update existing contract
            content = content.replace(
                new RegExp(`export const ${sdkName}[\\s\\S]*?= {[\\s\\S]*?}`),
                `export const ${sdkName}: Record<number, Address> = ${JSON.stringify(
                    contractRegistry[deploymentName],
                    undefined,
                    4,
                )}`,
            );
        } else {
            // Add new contract
            content = `${content}\n\nexport const ${sdkName}: Record<number, Address> = ${JSON.stringify(
                contractRegistry[deploymentName],
                undefined,
                4,
            )};`;
        }
    });

    writeFileSync(constantsV3, content);
}

updateDeployments();
