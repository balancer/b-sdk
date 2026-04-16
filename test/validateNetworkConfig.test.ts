// pnpm test test/validateNetworkConfig.test.ts

import { config } from 'dotenv';
config();

import { createPublicClient, http, getAddress, type Address } from 'viem';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import {
    CHAINS,
    ChainId,
    PERMIT2,
    NATIVE_ASSETS,
    API_CHAIN_NAMES,
    balancerV3Contracts,
} from '@/utils';

// ─── ABI fragments ──────────────────────────────────────────────────────────

const versionAbi = [
    {
        inputs: [],
        name: 'version',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const getVaultAbi = [
    {
        inputs: [],
        name: 'getVault',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const getVaultExtensionAbi = [
    {
        inputs: [],
        name: 'getVaultExtension',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const getVaultAdminAbi = [
    {
        inputs: [],
        name: 'getVaultAdmin',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

const getPermit2Abi = [
    {
        inputs: [],
        name: 'getPermit2',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

type ContractValidation = {
    expectedVersion?: string;
    hasGetVault?: true;
    hasGetPermit2?: true;
    hasGetVaultExtension?: true;
    hasGetVaultAdmin?: true;
};

type CallMeta = {
    contractName: string;
    callType:
        | 'version'
        | 'getVault'
        | 'getPermit2'
        | 'getVaultExtension'
        | 'getVaultAdmin';
};

// ─── Validation config ──────────────────────────────────────────────────────
// 14 contracts have version(). 4 do not: Vault, VaultAdmin, VaultExtension, MevCaptureHook.

const CONTRACT_CHECKS: Record<string, ContractValidation> = {
    BatchRouter: {
        expectedVersion:
            '{"name":"BatchRouter","version":1,"deployment":"20241205-v3-batch-router"}',
    },
    BufferRouter: {
        expectedVersion:
            '{"name":"BufferRouter","version":1,"deployment":"20241205-v3-buffer-router"}',
    },
    CompositeLiquidityRouter: {
        expectedVersion:
            '{"name":"CompositeLiquidityRouter","version":2,"deployment":"20250123-v3-composite-liquidity-router-v2"}',
    },
    FixedPriceLBPoolFactory: {
        expectedVersion:
            '{"name":"FixedPriceLBPoolFactory","version":1,"deployment":"20251205-v3-fixed-price-lbp"}',
        hasGetVault: true,
    },
    GyroECLPPoolFactory: {
        expectedVersion:
            '{"name":"GyroECLPPoolFactory","version":2,"deployment":"20260126-v3-gyro-eclp-v2"}',
        hasGetVault: true,
    },
    LBPMigrationRouter: {
        expectedVersion:
            '{"name":"LBPMigrationRouter","version":3,"deployment":"20251219-v3-liquidity-bootstrapping-pool-v3"}',
    },
    LBPoolFactory: {
        expectedVersion:
            '{"name":"LBPoolFactory","version":3,"deployment":"20251219-v3-liquidity-bootstrapping-pool-v3"}',
        hasGetVault: true,
    },
    MevCaptureHook: {},
    ReClammPoolFactory: {
        expectedVersion:
            '{"name":"ReClammPoolFactory","version":2,"deployment":"20250702-v3-reclamm-pool-v2"}',
        hasGetVault: true,
    },
    Router: {
        expectedVersion:
            '{"name":"Router","version":2,"deployment":"20250307-v3-router-v2"}',
        hasGetPermit2: true,
    },
    StablePoolFactory: {
        expectedVersion:
            '{"name":"StablePoolFactory","version":3,"deployment":"20260116-v3-stable-pool-v3"}',
        hasGetVault: true,
    },
    StableSurgeHook: {
        expectedVersion:
            '{"name":"StableSurgeHook","version":2,"deployment":"20250403-v3-stable-surge-hook-v2"}',
    },
    StableSurgePoolFactory: {
        expectedVersion:
            '{"name":"StableSurgePoolFactory","version":3,"deployment":"20260117-v3-stable-surge-pool-factory-v3"}',
        hasGetVault: true,
    },
    UnbalancedAddViaSwapRouter: {
        expectedVersion:
            '{"name":"UnbalancedAddViaSwapRouter","version":1,"deployment":"20251010-v3-unbalanced-add-via-swap-router"}',
        hasGetVault: true,
    },
    Vault: { hasGetVaultExtension: true },
    VaultAdmin: {},
    VaultExtension: { hasGetVaultAdmin: true },
    WeightedPoolFactory: {
        expectedVersion:
            '{"name":"WeightedPoolFactory","version":2,"deployment":"20260115-v3-weighted-pool-v2"}',
        hasGetVault: true,
    },
};

// ─── Chains to test ─────────────────────────────────────────────────────────

const CHAINS_TO_TEST: ChainId[] = [
    ChainId.MAINNET,
    ChainId.ARBITRUM_ONE,
    ChainId.AVALANCHE,
    ChainId.BASE,
    ChainId.GNOSIS_CHAIN,
    ChainId.OPTIMISM,
    ChainId.SONIC,
    ChainId.SEPOLIA,
    ChainId.HYPEREVM,
    ChainId.PLASMA,
    ChainId.MONAD,
    // ChainId.X_LAYER -- Not officially supported yet
];

// ─── Expected-missing per chain (derived from balancerV3Contracts gaps) ─────

const EXPECTED_MISSING: Partial<Record<ChainId, string[]>> = {
    [ChainId.AVALANCHE]: [
        'LBPoolFactory',
        'FixedPriceLBPoolFactory',
        'LBPMigrationRouter',
    ],
    [ChainId.OPTIMISM]: [
        'LBPoolFactory',
        'FixedPriceLBPoolFactory',
        'LBPMigrationRouter',
    ],
    [ChainId.MONAD]: ['MevCaptureHook'],
    [ChainId.PLASMA]: ['MevCaptureHook'],
    [ChainId.SONIC]: ['MevCaptureHook', 'LBPMigrationRouter'],
    [ChainId.X_LAYER]: ['MevCaptureHook'],
};

// ─── RPC resolution (env var with fallback, no Anvil) ───────────────────────

const CHAIN_RPC: Record<number, { rpcEnv: string; fallBackRpc: string }> = {
    [ChainId.MAINNET]: {
        rpcEnv: 'ETHEREUM_RPC_URL',
        fallBackRpc: 'https://mainnet.gateway.tenderly.co',
    },
    [ChainId.ARBITRUM_ONE]: {
        rpcEnv: 'ARBITRUM_ONE_RPC_URL',
        fallBackRpc: 'https://arbitrum.gateway.tenderly.co/',
    },
    [ChainId.AVALANCHE]: {
        rpcEnv: 'AVALANCHE_RPC_URL',
        fallBackRpc: 'https://avalanche.gateway.tenderly.co/',
    },
    [ChainId.BASE]: {
        rpcEnv: 'BASE_RPC_URL',
        fallBackRpc: 'https://mainnet.base.org',
    },
    [ChainId.GNOSIS_CHAIN]: {
        rpcEnv: 'GNOSIS_CHAIN_RPC_URL',
        fallBackRpc: 'https://rpc.gnosischain.com',
    },
    [ChainId.OPTIMISM]: {
        rpcEnv: 'OPTIMISM_RPC_URL',
        fallBackRpc: 'https://optimism.gateway.tenderly.co/',
    },
    [ChainId.SONIC]: {
        rpcEnv: 'SONIC_RPC_URL',
        fallBackRpc: 'https://sonic.drpc.org',
    },
    [ChainId.SEPOLIA]: {
        rpcEnv: 'SEPOLIA_RPC_URL',
        fallBackRpc: 'https://sepolia.gateway.tenderly.co',
    },
    [ChainId.HYPEREVM]: {
        rpcEnv: 'HYPEREVM_RPC_URL',
        fallBackRpc: 'https://rpc.hyperliquid.xyz/evm',
    },
    [ChainId.PLASMA]: {
        rpcEnv: 'PLASMA_RPC_URL',
        fallBackRpc: 'https://rpc.plasma.to/',
    },
    [ChainId.MONAD]: {
        rpcEnv: 'MONAD_RPC_URL',
        fallBackRpc: 'https://rpc.monad.xyz',
    },
};

function getRpcUrl(chainId: ChainId): string {
    const rpcConfig = CHAIN_RPC[chainId];
    if (!rpcConfig) throw new Error(`No RPC config for chainId ${chainId}`);
    const envUrl = process.env[rpcConfig.rpcEnv];
    if (envUrl && envUrl !== 'undefined') return envUrl;
    return rpcConfig.fallBackRpc;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getContractAddress(
    contractName: string,
    chainId: ChainId,
): Address | undefined {
    const addressMap = (
        balancerV3Contracts as Record<string, Partial<Record<number, string>>>
    )[contractName];
    return addressMap?.[chainId] as Address | undefined;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Network Configuration Validation', () => {
    describe.each(CHAINS_TO_TEST)('ChainId %s', (chainId: ChainId) => {
        test('has all required static config entries', () => {
            expect(CHAINS[chainId]).toBeDefined();
            expect(PERMIT2[chainId]).toBeDefined();
            expect(getAddress(PERMIT2[chainId])).toBeTruthy();
            expect(
                (NATIVE_ASSETS as Record<number, unknown>)[chainId],
            ).toBeDefined();
            expect(API_CHAIN_NAMES[chainId]).toBeDefined();

            const missingContracts: string[] = [];

            for (const contractName of Object.keys(CONTRACT_CHECKS)) {
                const address = getContractAddress(contractName, chainId);
                const isExpectedMissing =
                    EXPECTED_MISSING[chainId]?.includes(contractName) ?? false;

                if (!address && !isExpectedMissing) {
                    missingContracts.push(contractName);
                } else if (!address && isExpectedMissing) {
                    console.warn(
                        `[Chain ${chainId}] ${contractName}: expected missing`,
                    );
                } else if (address && isExpectedMissing) {
                    console.warn(
                        `[Chain ${chainId}] ${contractName}: stale exclusion — address present but marked expected-missing`,
                    );
                }
            }

            expect(missingContracts).toEqual([]);

            expect(() => AddressProvider.Vault(chainId)).not.toThrow();
            expect(() => AddressProvider.Router(chainId)).not.toThrow();
            expect(() => AddressProvider.BatchRouter(chainId)).not.toThrow();
        });

        test('all expected contracts are deployed with correct version and cross-references', async () => {
            const rpcUrl = getRpcUrl(chainId);
            const client = createPublicClient({
                chain: CHAINS[chainId],
                transport: http(rpcUrl),
            });

            const calls: {
                address: Address;
                abi: readonly {
                    readonly inputs: readonly [];
                    readonly name: string;
                    readonly outputs: readonly { readonly type: string }[];
                    readonly stateMutability: string;
                    readonly type: string;
                }[];
                functionName: string;
            }[] = [];
            const callMeta: CallMeta[] = [];

            for (const contractName of Object.keys(CONTRACT_CHECKS)) {
                const address = getContractAddress(contractName, chainId);
                if (!address) continue;

                const check = CONTRACT_CHECKS[contractName];

                if (check.expectedVersion) {
                    calls.push({
                        address,
                        abi: versionAbi,
                        functionName: 'version',
                    });
                    callMeta.push({
                        contractName,
                        callType: 'version',
                    });
                }
                if (check.hasGetVault) {
                    calls.push({
                        address,
                        abi: getVaultAbi,
                        functionName: 'getVault',
                    });
                    callMeta.push({
                        contractName,
                        callType: 'getVault',
                    });
                }
                if (check.hasGetPermit2) {
                    calls.push({
                        address,
                        abi: getPermit2Abi,
                        functionName: 'getPermit2',
                    });
                    callMeta.push({
                        contractName,
                        callType: 'getPermit2',
                    });
                }
                if (check.hasGetVaultExtension) {
                    calls.push({
                        address,
                        abi: getVaultExtensionAbi,
                        functionName: 'getVaultExtension',
                    });
                    callMeta.push({
                        contractName,
                        callType: 'getVaultExtension',
                    });
                }
                if (check.hasGetVaultAdmin) {
                    calls.push({
                        address,
                        abi: getVaultAdminAbi,
                        functionName: 'getVaultAdmin',
                    });
                    callMeta.push({
                        contractName,
                        callType: 'getVaultAdmin',
                    });
                }
            }

            if (calls.length === 0) return;

            const results = await client.multicall({
                contracts: calls as Parameters<
                    typeof client.multicall
                >[0]['contracts'],
                allowFailure: true,
            });

            const expectedVault = getContractAddress('Vault', chainId)!;
            const expectedVaultExt = getContractAddress(
                'VaultExtension',
                chainId,
            )!;
            const expectedVaultAdmin = getContractAddress(
                'VaultAdmin',
                chainId,
            )!;
            const expectedPermit2 = PERMIT2[chainId];

            const errors: string[] = [];

            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const meta = callMeta[i];

                if (result.status === 'failure') {
                    errors.push(
                        `${meta.contractName}.${meta.callType}() reverted`,
                    );
                    continue;
                }

                const value = result.result;

                switch (meta.callType) {
                    case 'version': {
                        const expected =
                            CONTRACT_CHECKS[meta.contractName].expectedVersion!;
                        if (expected === 'PLACEHOLDER') {
                            console.log(
                                `[Chain ${chainId}] ${meta.contractName}.version() = "${value}"`,
                            );
                        } else if (value !== expected) {
                            errors.push(
                                `${meta.contractName}.version(): expected "${expected}", got "${value}"`,
                            );
                        }
                        break;
                    }
                    case 'getVault':
                        if (
                            getAddress(value as Address) !==
                            getAddress(expectedVault)
                        ) {
                            errors.push(
                                `${meta.contractName}.getVault(): expected ${expectedVault}, got ${value}`,
                            );
                        }
                        break;
                    case 'getPermit2':
                        if (
                            getAddress(value as Address) !==
                            getAddress(expectedPermit2)
                        ) {
                            errors.push(
                                `${meta.contractName}.getPermit2(): expected ${expectedPermit2}, got ${value}`,
                            );
                        }
                        break;
                    case 'getVaultExtension':
                        if (
                            getAddress(value as Address) !==
                            getAddress(expectedVaultExt)
                        ) {
                            errors.push(
                                `${meta.contractName}.getVaultExtension(): expected ${expectedVaultExt}, got ${value}`,
                            );
                        }
                        break;
                    case 'getVaultAdmin':
                        if (
                            getAddress(value as Address) !==
                            getAddress(expectedVaultAdmin)
                        ) {
                            errors.push(
                                `${meta.contractName}.getVaultAdmin(): expected ${expectedVaultAdmin}, got ${value}`,
                            );
                        }
                        break;
                }
            }

            expect(errors).toEqual([]);
        }, 60_000);
    });
});
