import dotenv from 'dotenv';
dotenv.config();

import { Anvil, CreateAnvilOptions, createAnvil } from '@viem/anvil';
import { ChainId } from '../../src/utils/constants';
import { sleep, retryWithBackoff } from '../lib/utils/promises';

export type NetworkSetup = {
    rpcEnv: string;
    fallBackRpc: string | undefined;
    port: number;
    forkBlockNumber: bigint;
};

type NetworksWithFork = Extract<
    keyof typeof ChainId,
    | 'MAINNET'
    | 'POLYGON'
    | 'FANTOM'
    | 'SEPOLIA'
    | 'OPTIMISM'
    | 'MODE'
    | 'FRAXTAL'
    | 'AVALANCHE'
    | 'ARBITRUM_ONE'
    | 'GNOSIS_CHAIN'
    | 'SONIC'
    | 'HYPEREVM'
    | 'PLASMA'
    | 'X_LAYER'
>;

const ANVIL_PORTS: Record<NetworksWithFork, number> = {
    //Ports separated by 100 to avoid port collision when running tests in parallel
    MAINNET: 8645,
    POLYGON: 8745,
    FANTOM: 8845,
    SEPOLIA: 8945,
    OPTIMISM: 9045,
    MODE: 9145,
    FRAXTAL: 9245,
    AVALANCHE: 9345,
    ARBITRUM_ONE: 9445,
    GNOSIS_CHAIN: 9545,
    SONIC: 9645,
    HYPEREVM: 9745,
    PLASMA: 9845,
    X_LAYER: 9945,
};

export const ANVIL_NETWORKS: Record<NetworksWithFork, NetworkSetup> = {
    MAINNET: {
        rpcEnv: 'ETHEREUM_RPC_URL',
        fallBackRpc: 'https://mainnet.gateway.tenderly.co',
        port: ANVIL_PORTS.MAINNET,
        forkBlockNumber: 21373640n,
    },
    POLYGON: {
        rpcEnv: 'POLYGON_RPC_URL',
        fallBackRpc: 'https://polygon.gateway.tenderly.co',
        port: ANVIL_PORTS.POLYGON,
        forkBlockNumber: 44215395n,
    },
    FANTOM: {
        rpcEnv: 'FANTOM_RPC_URL',
        // Public Fantom RPCs are usually unreliable
        fallBackRpc: undefined,
        port: ANVIL_PORTS.FANTOM,
        forkBlockNumber: 65313450n,
    },
    SEPOLIA: {
        rpcEnv: 'SEPOLIA_RPC_URL',
        fallBackRpc: 'https://sepolia.gateway.tenderly.co',
        port: ANVIL_PORTS.SEPOLIA,
        forkBlockNumber: 8069420n,
    },
    OPTIMISM: {
        rpcEnv: 'OPTIMISM_RPC_URL',
        fallBackRpc: 'https://optimism.gateway.tenderly.co/',
        port: ANVIL_PORTS.OPTIMISM,
        forkBlockNumber: 117374265n,
    },
    MODE: {
        rpcEnv: 'MODE_RPC_URL',
        fallBackRpc: 'https://mode.gateway.tenderly.co/',
        port: ANVIL_PORTS.MODE,
        forkBlockNumber: 10484897n,
    },
    FRAXTAL: {
        rpcEnv: 'FRAXTAL_RPC_URL',
        fallBackRpc: 'https://fraxtal.gateway.tenderly.co/',
        port: ANVIL_PORTS.FRAXTAL,
        forkBlockNumber: 7164945n,
    },
    AVALANCHE: {
        rpcEnv: 'AVALANCHE_RPC_URL',
        fallBackRpc: 'https://avalanche.gateway.tenderly.co/',
        port: ANVIL_PORTS.AVALANCHE,
        forkBlockNumber: 48164407n,
    },
    ARBITRUM_ONE: {
        rpcEnv: 'ARBITRUM_ONE_RPC_URL',
        fallBackRpc: 'https://arbitrum.gateway.tenderly.co/',
        port: ANVIL_PORTS.ARBITRUM_ONE,
        forkBlockNumber: 234936318n,
    },
    GNOSIS_CHAIN: {
        rpcEnv: 'GNOSIS_CHAIN_RPC_URL',
        fallBackRpc: 'https://rpc.ankr.com/gnosis',
        port: ANVIL_PORTS.GNOSIS_CHAIN,
        forkBlockNumber: 38091627n,
    },
    SONIC: {
        rpcEnv: 'SONIC_RPC_URL',
        fallBackRpc: 'https://sonic.drpc.org',
        port: ANVIL_PORTS.SONIC,
        forkBlockNumber: 7728765n,
    },
    HYPEREVM: {
        rpcEnv: 'HYPEREVM_RPC_URL',
        fallBackRpc: 'https://rpc.hyperliquid.xyz/evm',
        port: ANVIL_PORTS.HYPEREVM,
        forkBlockNumber: 6892528n,
    },
    PLASMA: {
        rpcEnv: 'PLASMA_RPC_URL',
        fallBackRpc: 'https://rpc.plasma.to/',
        port: ANVIL_PORTS.PLASMA,
        forkBlockNumber: 1274881n,
    },
    X_LAYER: {
        rpcEnv: 'X_LAYER_RPC_URL',
        fallBackRpc: 'https://rpc.xlayer.tech',
        port: ANVIL_PORTS.X_LAYER,
        forkBlockNumber: 43138155n,
    },
};

function getAnvilOptions(
    network: NetworkSetup,
    blockNumber?: bigint,
): CreateAnvilOptions {
    let forkUrl: string;
    if (
        process.env[network.rpcEnv] &&
        process.env[network.rpcEnv] !== 'undefined' // sometimes .env will return 'undefined' as string for undefined variables
    ) {
        forkUrl = process.env[network.rpcEnv] as string;
    } else {
        if (!network.fallBackRpc)
            throw Error(
                `Please add a environment variable for: ${network.rpcEnv}`,
            );
        forkUrl = network.fallBackRpc;
        console.warn(
            `\`${network.rpcEnv}\` not found. Falling back to \`${forkUrl}\`.`,
        );
    }
    const port = network.port;
    const forkBlockNumber = blockNumber ?? network.forkBlockNumber;
    return {
        forkUrl,
        port,
        forkBlockNumber,
    };
}

// Controls the current running forks for cleanup purposes
let runningForks: Record<number, Anvil> = {};

// Mutex for fork creation to prevent simultaneous RPC hits
let forkCreationLock: Promise<void> = Promise.resolve();
let lastForkStartTime = 0;
// In CI, use longer delays to handle stricter rate limits
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const MIN_DELAY_BETWEEN_FORK_STARTS = isCI ? 5000 : 2000; // 5 seconds in CI, 2 seconds locally

// Make sure that forks are stopped after each test suite
export async function stopAnvilForks() {
    await Promise.all(
        Object.values(runningForks).map(async (anvil) => {
            // console.log('Stopping anvil fork', anvil.options);
            return anvil.stop();
        }),
    );
    runningForks = {};
}

// Stop a specific anvil fork
export async function stopAnvilFork(
    network: NetworkSetup,
    jobId = Number(process.env.VITEST_WORKER_ID) || 0,
    blockNumber?: bigint, // If not provided, the fork will start from the network's forkBlockNumber
) {
    const anvilOptions = getAnvilOptions(network, blockNumber);

    const defaultAnvilPort = 8545;
    const port = (anvilOptions.port || defaultAnvilPort) + jobId;
    // Avoid starting fork if it was running already
    if (!runningForks[port]) return;

    await runningForks[port].stop();
    delete runningForks[port];
}

/**
 * Generate a unique port for a test suite to prevent fork sharing
 * Uses test file path hash + network port to ensure isolation
 */
function generateUniquePort(
    basePort: number,
    jobId: number,
    testSuiteId?: string,
): number {
    // If testSuiteId is provided (e.g., from vitest), use it to create unique ports
    if (testSuiteId) {
        // Simple hash function to convert test suite ID to a number
        let hash = 0;
        for (let i = 0; i < testSuiteId.length; i++) {
            const char = testSuiteId.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        // Use hash to create unique port offset (0-99 range)
        const offset = Math.abs(hash) % 100;
        return basePort + jobId + offset;
    }
    // Fallback: use timestamp-based offset for uniqueness
    const timestampOffset = Math.floor(Date.now() / 1000) % 100;
    return basePort + jobId + timestampOffset;
}

/*
    Starts an anvil fork with the given options.
    In vitest, each thread is assigned a unique, numerical id (`process.env.VITEST_POOL_ID`).
    When jobId is provided, the fork uses this id to create a different local rpc url (e.g. `http://127.0.0.1:<8545+jobId>/`
    so that tests can be run in parallel (depending on the number of threads of the host machine)
*/
export async function startFork(
    network: NetworkSetup,
    jobId = Number(process.env.VITEST_WORKER_ID) || 0,
    blockNumber?: bigint, // If not provided, the fork will start from the network's forkBlockNumber
    blockTime?: number,
    testSuiteId?: string, // Optional test suite identifier for unique port generation
) {
    const anvilOptions = getAnvilOptions(network, blockNumber);

    const defaultAnvilPort = 8545;
    const basePort = anvilOptions.port || defaultAnvilPort;

    // Generate unique port per test suite to prevent fork sharing
    const port = generateUniquePort(basePort, jobId, testSuiteId);

    if (!anvilOptions.forkUrl) {
        throw Error(
            'Anvil forkUrl must have a value. Please review your anvil setup',
        );
    }
    const rpcUrl = `http://127.0.0.1:${port}`;

    console.log('checking rpcUrl', port, runningForks);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7f662b26-1a32-4a2e-98ea-db0b93d9db39', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            location: 'anvil-global-setup.ts:259',
            message: 'startFork called',
            data: {
                network: network.rpcEnv,
                port,
                blockNumber: blockNumber?.toString(),
                forkBlockNumber: anvilOptions.forkBlockNumber?.toString(),
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'A,E',
        }),
    }).catch(() => {});
    // #endregion

    // Always create a fresh fork - no reuse to avoid state conflicts
    // Use mutex to serialize fork creation
    await forkCreationLock;

    // Wait for minimum delay between fork starts
    const timeSinceLastStart = Date.now() - lastForkStartTime;
    const waitTime =
        timeSinceLastStart < MIN_DELAY_BETWEEN_FORK_STARTS
            ? MIN_DELAY_BETWEEN_FORK_STARTS - timeSinceLastStart
            : 0;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7f662b26-1a32-4a2e-98ea-db0b93d9db39', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            location: 'anvil-global-setup.ts:266',
            message: 'delay calculation',
            data: {
                timeSinceLastStart,
                waitTime,
                lastForkStartTime,
                network: network.rpcEnv,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'A',
        }),
    }).catch(() => {});
    // #endregion
    if (waitTime > 0) {
        await sleep(waitTime);
    }

    // Create new lock for next fork creation
    let resolveLock: () => void;
    forkCreationLock = new Promise((resolve) => {
        resolveLock = resolve;
    });

    try {
        // Stagger fork starts to prevent simultaneous RPC hits
        // Random delay between 0-5000ms locally, 0-10000ms in CI to spread out requests more
        // Longer delay in CI to reduce rate limiting
        const maxStaggerDelay = isCI ? 10000 : 5000;
        const staggerDelay = Math.floor(Math.random() * maxStaggerDelay);
        // #region agent log
        fetch(
            'http://127.0.0.1:7242/ingest/7f662b26-1a32-4a2e-98ea-db0b93d9db39',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    location: 'anvil-global-setup.ts:281',
                    message: 'stagger delay',
                    data: { staggerDelay, network: network.rpcEnv, port },
                    timestamp: Date.now(),
                    sessionId: 'debug-session',
                    runId: 'run1',
                    hypothesisId: 'A',
                }),
            },
        ).catch(() => {});
        // #endregion
        if (staggerDelay > 0) {
            await sleep(staggerDelay);
        }

        if (process.env.SKIP_GLOBAL_SETUP === 'true') {
            console.warn(`🛠️  Skipping global anvil setup. You must run the anvil fork manually. Example:
anvil --fork-url https://eth-mainnet.alchemyapi.io/v2/<your-key> --port 8545 --fork-block-number=17878719
`);
            await sleep(5000);
            resolveLock!();
            return { rpcUrl };
        }

        const forkBlockNumber = blockNumber ?? anvilOptions.forkBlockNumber;
        console.log('🛠️  Starting anvil', {
            port,
            forkBlockNumber,
            network: network.rpcEnv,
            forkUrl: anvilOptions.forkUrl.replace(
                /([?&]api[_-]?key=)[^&]*/gi,
                '$1***',
            ), // Mask API keys in logs
        });

        let anvil: Anvil | undefined;
        try {
            await retryWithBackoff(
                async () => {
                    const attemptStartTime = Date.now();
                    // #region agent log
                    fetch(
                        'http://127.0.0.1:7242/ingest/7f662b26-1a32-4a2e-98ea-db0b93d9db39',
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                location: 'anvil-global-setup.ts:319',
                                message: 'anvil.start attempt',
                                data: {
                                    network: network.rpcEnv,
                                    port,
                                    blockNumber: forkBlockNumber?.toString(),
                                    timeSinceLastFork:
                                        attemptStartTime - lastForkStartTime,
                                },
                                timestamp: Date.now(),
                                sessionId: 'debug-session',
                                runId: 'run1',
                                hypothesisId: 'A,D',
                            }),
                        },
                    ).catch(() => {});
                    // #endregion
                    // Clean up any previous failed attempt
                    if (anvil) {
                        try {
                            await anvil.stop();
                        } catch {
                            // Ignore cleanup errors from previous attempts
                        }
                    }
                    // Create a fresh anvil instance for each retry attempt
                    anvil = createAnvil({ ...anvilOptions, port, blockTime });
                    await anvil.start();
                    // Save reference for cleanup purposes
                    runningForks[port] = anvil;
                    lastForkStartTime = Date.now();
                    // #region agent log
                    fetch(
                        'http://127.0.0.1:7242/ingest/7f662b26-1a32-4a2e-98ea-db0b93d9db39',
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                location: 'anvil-global-setup.ts:323',
                                message: 'anvil.start success',
                                data: {
                                    network: network.rpcEnv,
                                    port,
                                    duration: Date.now() - attemptStartTime,
                                },
                                timestamp: Date.now(),
                                sessionId: 'debug-session',
                                runId: 'run1',
                                hypothesisId: 'D',
                            }),
                        },
                    ).catch(() => {});
                    // #endregion
                },
                {
                    maxAttempts: 5,
                    // In CI, use longer initial delay and max delay for 429 errors
                    initialDelayMs: isCI ? 5000 : 3000,
                    maxDelayMs: isCI ? 30000 : 20000,
                    shouldRetry: (error) => {
                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : String(error);
                        const isRetryable =
                            errorMessage.includes('429') ||
                            errorMessage.includes('Max retries exceeded') ||
                            errorMessage.includes('failed to get account') ||
                            errorMessage.includes('failed to fetch') ||
                            errorMessage.includes('failed to create genesis') ||
                            errorMessage.includes('state') ||
                            errorMessage.includes('not available') ||
                            errorMessage.includes(
                                'failed to fetch network chain ID',
                            ) ||
                            errorMessage.includes('Anvil failed to start') ||
                            errorMessage.includes('Anvil exited');
                        // #region agent log
                        fetch(
                            'http://127.0.0.1:7242/ingest/7f662b26-1a32-4a2e-98ea-db0b93d9db39',
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    location: 'anvil-global-setup.ts:329',
                                    message: 'retry decision',
                                    data: {
                                        network: network.rpcEnv,
                                        port,
                                        isRetryable,
                                        errorType: errorMessage.includes('429')
                                            ? '429'
                                            : errorMessage.includes('state')
                                              ? 'state'
                                              : errorMessage.includes('genesis')
                                                ? 'genesis'
                                                : 'other',
                                        errorSnippet: errorMessage.substring(
                                            0,
                                            100,
                                        ),
                                    },
                                    timestamp: Date.now(),
                                    sessionId: 'debug-session',
                                    runId: 'run1',
                                    hypothesisId: 'B,C',
                                }),
                            },
                        ).catch(() => {});
                        // #endregion
                        // Retry on rate limiting, network errors, and anvil startup failures
                        return isRetryable;
                    },
                },
            );

            resolveLock!();
            return {
                rpcUrl,
            };
        } catch (error) {
            // Clean up on failure
            delete runningForks[port];
            // Try to stop the anvil instance if it exists to prevent unhandled rejections
            if (anvil) {
                try {
                    await anvil.stop();
                } catch {
                    // Ignore cleanup errors
                }
            }
            resolveLock!();
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            const forkBlockNumber = blockNumber ?? anvilOptions.forkBlockNumber;
            throw new Error(
                `Failed to start anvil fork after retries: ${errorMessage}\n` +
                    `Network: ${network.rpcEnv}, Port: ${port}, Block: ${forkBlockNumber}`,
            );
        }
    } catch (error) {
        // Outer catch for mutex/lock errors
        resolveLock!();
        throw error;
    }
}
