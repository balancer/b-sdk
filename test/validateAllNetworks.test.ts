import { config } from 'dotenv';
config();
import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    TestActions,
    Hex,
} from 'viem';
import {
    CHAINS,
    ChainId,
    SwapKind,
    Swap,
    PERMIT2,
    PublicWalletClient,
} from '@/index';
import { Path } from '@/entities/swap/paths/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import {
    approveSpenderOnTokens,
    approveTokens,
    setTokenBalances,
} from 'test/lib/utils/helper';
import { POOLS, TOKENS, TestToken, TestPool } from 'test/lib/utils/addresses';
import {
    ANVIL_NETWORKS,
    startFork,
    NetworkSetup,
} from 'test/anvil/anvil-global-setup';
import { runSwapTest } from 'test/lib/utils/swapTestRunner';
import { TEST_CONSTANTS } from 'test/entities/swaps/v3/swapTestConfig';

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
};

// Optionally override fork block numbers for specific chains. Useful to select pools deployed on V3 after
// the specified block in anvil-global-setup.ts
const BLOCK_NUMBER_OVERRIDES: Partial<Record<number, bigint>> = {
    [ChainId.HYPEREVM]: 6892528n,
    [ChainId.MAINNET]: 22788192n,
    [ChainId.PLASMA]: 1274881n,
    [ChainId.X_LAYER]: 43173129n,
};

// List of ChainIds to run the test for. Modify this array to select which chains to test.
const CHAINS_TO_TEST: number[] = [
    ChainId.SEPOLIA,
    ChainId.HYPEREVM,
    ChainId.PLASMA,
    ChainId.X_LAYER,
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

            // Start fork and get rpcUrl
            const fork = await startFork(anvilNetwork, undefined, blockNumber);
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

        test('GivenIn', async () => {
            await approveTokens(
                client,
                testAddress,
                [tokenIn.address, tokenOut.address],
                protocolVersion,
            );

            // Use runSwapTest without saving results
            // Pass empty objects so data isn't persisted
            await runSwapTest(
                {
                    chainId,
                    path: swapPath,
                    swapKind: SwapKind.GivenIn,
                    wethIsEth: false,
                    fork: { rpcUrl },
                    contractToCall: AddressProvider.Router(chainId),
                    client,
                    testAddress,
                    slippage: TEST_CONSTANTS.slippage,
                    deadline: TEST_CONSTANTS.deadline,
                    testName: `validateAllNetworks-${chainId}`,
                    context: 'network validation',
                    outputTest: TEST_CONSTANTS.defaultOutputTest,
                },
                {}, // Empty savedSwapTestData - always run fresh
                {}, // Empty swapTestData - don't save results
            );
        });
    });
});
