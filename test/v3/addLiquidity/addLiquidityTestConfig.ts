import { ChainId, Slippage, PoolState, InputAmount, Address } from '@/index';
import { ANVIL_NETWORKS, NetworkSetup } from 'test/anvil/anvil-global-setup';

// Test context constants for add liquidity tests
export const TEST_CONTEXTS = {
    NATIVE_INPUT: 'native input',
    PERMIT2_SIGNATURE_APPROVAL: 'permit2 signature approval',
    PERMIT2_DIRECT_APPROVAL: 'permit2 direct approval',
} as const;

// Test configuration constants
export const TEST_CONSTANTS = {
    ANVIL_TEST_ADDRESS: '0x831eFb058FEdCd16Cd6b9174206DFe452dDCe8C3', // address from mnemonic "you twelve word test phrase boat cat like this example dog car"
    BALANCE_MULTIPLIER: 10n, // For setting token balances
    slippage: Slippage.fromPercentage('0.1'),
    deadline: 999999999999999999n,
    ADD_LIQUIDITY_TEST_DATA_FILENAME: 'addLiquidityTestData.json',
} as const;

export type Test = {
    name: string;
    chainId: ChainId;
    anvilNetwork: NetworkSetup;
    poolState: PoolState; // Hardcoded pool state in config
    isNativeIn: boolean;
    // Input amounts for each test type (all configurable per test)
    unbalancedAmounts: InputAmount[]; // Required - amounts for each pool token
    singleTokenBptOut: InputAmount; // Required - BPT amount for single token test
    singleTokenIn: Address; // Required - which token to use for single token test
    proportionalBptOut: InputAmount; // Required - BPT amount for proportional test
    proportionalAmountIn: InputAmount; // Required - token amount for proportional test
    blockNumber?: bigint;
};

/**
 * Mainnet pool configuration for add liquidity tests.
 * Pool: 0xbda917a67c7d9ae67da92c4ea87e10e5d6c11b54 (Weighted pool)
 * Tokens:
 *   - WETH: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
 *   - Token: 0xec53bf9167f50cdeb3ae105f56099aaab9061f83
 */
const mainnetPoolState: PoolState = {
    id: '0xbda917a67c7d9ae67da92c4ea87e10e5d6c11b54',
    address: '0xbda917a67c7d9ae67da92c4ea87e10e5d6c11b54',
    type: 'Weighted',
    protocolVersion: 3,
    tokens: [
        {
            address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
            decimals: 18,
            index: 0,
        },
        {
            address: '0xec53bf9167f50cdeb3ae105f56099aaab9061f83' as Address, // EIGEN
            decimals: 18,
            index: 1,
        },
    ],
};

/**
 * Test configurations for add liquidity integration tests.
 * Each test defines:
 *   - Pool state and chain configuration
 *   - Input amounts for different add liquidity types (Unbalanced, SingleToken, Proportional)
 *   - Block number for fork state (ensures consistent pool state)
 *
 * Amounts are chosen to be reasonable for testing (1 token = 1e18 wei).
 * The block number corresponds to a specific state of the pool on mainnet.
 */
export const tests: Test[] = [
    {
        name: 'Add Liquidity: WETH + Token Pool',
        chainId: ChainId.MAINNET,
        anvilNetwork: ANVIL_NETWORKS.MAINNET,
        poolState: mainnetPoolState,
        isNativeIn: true,
        unbalancedAmounts: [
            {
                address:
                    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
                decimals: 18,
                rawAmount: 1000000000000000000n, // 1 WETH
            },
            {
                address:
                    '0xec53bf9167f50cdeb3ae105f56099aaab9061f83' as Address,
                decimals: 18,
                rawAmount: 1000000000000000000n, // 1 token
            },
        ],
        singleTokenBptOut: {
            address: '0xbda917a67c7d9ae67da92c4ea87e10e5d6c11b54' as Address, // BPT
            decimals: 18,
            rawAmount: 1000000000000000000n, // 1 BPT
        },
        singleTokenIn: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
        proportionalBptOut: {
            address: '0xbda917a67c7d9ae67da92c4ea87e10e5d6c11b54' as Address, // BPT
            decimals: 18,
            rawAmount: 1000000000000000000n, // 1 BPT
        },
        proportionalAmountIn: {
            address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
            decimals: 18,
            rawAmount: 1000000000000000000n, // 1 WETH
        },
        blockNumber: 24045600n, // Specific block number for consistent pool state
    },
];
