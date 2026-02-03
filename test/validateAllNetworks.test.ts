// pnpm test test/validateAllNetworks.test.ts

import { config } from 'dotenv';
config();
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { Path } from '@/entities/swap/paths/types';
import {
    CHAINS,
    ChainId,
    PERMIT2,
    PublicWalletClient,
    Swap,
    SwapKind,
    Address,
} from '@/index';
import { POOLS, TOKENS, TestPool, TestToken } from 'test/lib/utils/addresses';
import {
    approveSpenderOnTokens,
    approveTokens,
    setTokenBalances,
} from 'test/lib/utils/helper';
import { assertSwapExactIn } from 'test/lib/utils/swapHelpers';
import {
    ANVIL_NETWORKS,
    startFork,
    stopAnvilFork,
    NetworkSetup,
} from 'test/anvil/anvil-global-setup';
import {
    http,
    TestActions,
    createTestClient,
    parseEther,
    publicActions,
    walletActions,
} from 'viem';

const protocolVersion = 3;

// Manual mapping between ChainId and ANVIL_NETWORKS keys
const CHAIN_ANVIL_MAP: Partial<Record<number, keyof typeof ANVIL_NETWORKS>> = {
    [ChainId.MAINNET]: 'MAINNET',
    [ChainId.POLYGON]: 'POLYGON',
    [ChainId.FANTOM]: 'FANTOM',
    [ChainId.SEPOLIA]: 'SEPOLIA',
    [ChainId.OPTIMISM]: 'OPTIMISM',
    [ChainId.MODE]: 'MODE',
    [ChainId.FRAXTAL]: 'FRAXTAL',
    [ChainId.AVALANCHE]: 'AVALANCHE',
    [ChainId.ARBITRUM_ONE]: 'ARBITRUM_ONE',
    [ChainId.GNOSIS_CHAIN]: 'GNOSIS_CHAIN',
    [ChainId.SONIC]: 'SONIC',
    [ChainId.HYPEREVM]: 'HYPEREVM',
    [ChainId.PLASMA]: 'PLASMA',
    [ChainId.X_LAYER]: 'X_LAYER',
    [ChainId.MONAD]: 'MONAD',
    // Add/remove mappings as needed for your test coverage
};

// Define a minimal config per network for tokens/pool/path
const NETWORK_CONFIG: Partial<
    Record<
        number,
        {
            tokenInKey: string;
            tokenOutKey: string;
            poolKey: string;
            inputAmountRaw: bigint;
        }
    >
> = {
    [ChainId.SEPOLIA]: {
        tokenInKey: 'BAL',
        tokenOutKey: 'WETH',
        poolKey: 'MOCK_WETH_BAL_POOL',
        inputAmountRaw: 100000000000n,
    },
    [ChainId.HYPEREVM]: {
        tokenInKey: 'feWETH',
        tokenOutKey: 'feUSD',
        poolKey: 'MOCK_FEUSD_FEWETH_POOL',
        inputAmountRaw: 100000000000n,
    },
    [ChainId.PLASMA]: {
        tokenInKey: 'USDT',
        tokenOutKey: 'weETH',
        poolKey: 'MOCK_USDT_WXPL_POOL',
        inputAmountRaw: 10000n,
    },
    [ChainId.X_LAYER]: {
        tokenInKey: 'USDT',
        tokenOutKey: 'xBTC',
        poolKey: 'MOCK_USDT_xBTC_POOL',
        inputAmountRaw: 10000n,
    },
    [ChainId.MONAD]: {
        tokenInKey: 'WMON',
        tokenOutKey: 'AUSD',
        poolKey: 'MOCK_WMON_AUSD_POOL',
        inputAmountRaw: 1000000000000000n,
    },
};

// Optionally override fork block numbers for specific chains. Useful to select pools deployed on V3 after
// the specified block in anvil-global-setup.ts
const BLOCK_NUMBER_OVERRIDES: Partial<Record<number, bigint>> = {
    [ChainId.HYPEREVM]: 6892528n,
    [ChainId.MAINNET]: 22788192n,
    [ChainId.PLASMA]: 1274881n,
    [ChainId.X_LAYER]: 43173129n,
    [ChainId.MONAD]: 52794217n,
};

// List of ChainIds to run the test for. Modify this array to select which chains to test.
const CHAINS_TO_TEST: number[] = [
    ChainId.SEPOLIA,
    ChainId.HYPEREVM,
    ChainId.PLASMA,
    ChainId.MONAD,
    // ChainId.X_LAYER, // X_LAYER is not live and RPC is giving issues on CI (No Alchemy available)
];

describe('validateAllNetworks', () => {
    // Only test chains that have a mapping to ANVIL_NETWORKS and are in CHAINS_TO_TEST
    const chainIds = CHAINS_TO_TEST.filter((id) => CHAIN_ANVIL_MAP[id]);

    describe.each(chainIds)('Chain %s', (chainId: number) => {
        let client: PublicWalletClient & TestActions;
        let testAddress: Address;
        let rpcUrl: string;
        let tokenIn: TestToken;
        let tokenOut: TestToken;
        let pool: TestPool;
        let swapPath: Path;

        beforeAll(async () => {
            const config = NETWORK_CONFIG[chainId];
            if (!config) return;

            // Use the direct mapping for ANVIL_NETWORKS
            const anvilKey = CHAIN_ANVIL_MAP[chainId];
            if (!anvilKey)
                throw new Error(
                    `No ANVIL_NETWORKS mapping found for chainId ${chainId}`,
                );
            const anvilNetwork: NetworkSetup = ANVIL_NETWORKS[anvilKey];
            if (!anvilNetwork)
                throw new Error(
                    `No ANVIL_NETWORKS entry found for key ${anvilKey} (chainId ${chainId})`,
                );

            // Use override block number if present
            const blockNumber = BLOCK_NUMBER_OVERRIDES[chainId];

            // Use longer timeout for X_LAYER due to slow RPC
            const startTimeout =
                chainId === ChainId.X_LAYER ? 120_000 : undefined;

            // Start fork and get rpcUrl
            const fork = await startFork(
                anvilNetwork,
                undefined,
                blockNumber,
                undefined,
                startTimeout,
            );
            rpcUrl = fork.rpcUrl;

            client = createTestClient({
                mode: 'anvil',
                chain: CHAINS[chainId],
                transport: http(rpcUrl),
            })
                .extend(publicActions)
                .extend(walletActions);

            testAddress = (await client.getAddresses())[0];

            // Load tokens/pool
            tokenIn = TOKENS[chainId]?.[config.tokenInKey];
            tokenOut = TOKENS[chainId]?.[config.tokenOutKey];
            pool = POOLS[chainId]?.[config.poolKey];

            // Set balances and approve
            if (tokenIn && tokenOut) {
                await setTokenBalances(
                    client,
                    testAddress,
                    [tokenIn.address, tokenOut.address],
                    [tokenIn.slot ?? 0, tokenOut.slot ?? 0],
                    [parseEther('100'), parseEther('100')],
                );
                if (PERMIT2[chainId]) {
                    await approveSpenderOnTokens(
                        client,
                        testAddress,
                        [tokenIn.address, tokenOut.address],
                        PERMIT2[chainId],
                    );
                }
            }

            // Build swap path
            if (tokenIn && tokenOut && pool) {
                swapPath = {
                    protocolVersion,
                    tokens: [
                        {
                            address: tokenIn.address,
                            decimals: tokenIn.decimals,
                        },
                        {
                            address: tokenOut.address,
                            decimals: tokenOut.decimals,
                        },
                    ],
                    pools: [pool.address],
                    inputAmountRaw: config.inputAmountRaw,
                    outputAmountRaw: 1n,
                };
            }
        });

        afterAll(async () => {
            // Clean up after each chain test
            const anvilKey = CHAIN_ANVIL_MAP[chainId];
            if (anvilKey) {
                const blockNumber = BLOCK_NUMBER_OVERRIDES[chainId];
                await stopAnvilFork(
                    ANVIL_NETWORKS[anvilKey],
                    undefined,
                    blockNumber,
                );
            }
        });

        test('GivenIn', async () => {
            await approveTokens(
                client,
                testAddress,
                [tokenIn.address, tokenOut.address],
                protocolVersion,
            );

            const swap = new Swap({
                chainId,
                paths: [swapPath],
                swapKind: SwapKind.GivenIn,
            });
            await assertSwapExactIn({
                contractToCall: AddressProvider.Router(chainId),
                client,
                rpcUrl,
                chainId,
                swap,
                wethIsEth: false,
            });
        }, 60_000);
    });
});
