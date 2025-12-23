import {
    ChainId,
    Slippage,
    PoolState,
    InputAmount,
    Address,
    BufferState,
    PoolStateWithUnderlyings,
    NestedPoolState,
} from '@/index';
import { ANVIL_NETWORKS, NetworkSetup } from 'test/anvil/anvil-global-setup';
import { nestedWithBoostedPool } from 'test/mockData/nestedPool';

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

// Base test type with common fields
type TestBase = {
    name: string;
    chainId: ChainId;
    anvilNetwork: NetworkSetup;
    blockNumber?: bigint;
};

// Regular add liquidity test
export type RegularTest = TestBase & {
    testType: 'regular';
    poolState: PoolState;
    isNativeIn: boolean;
    // Input amounts for each test type (all configurable per test)
    unbalancedAmounts: InputAmount[];
    singleTokenBptOut: InputAmount;
    singleTokenIn: Address;
    proportionalBptOut: InputAmount;
    proportionalAmountIn: InputAmount;
};

// Buffer add liquidity test
export type BufferTest = TestBase & {
    testType: 'buffer';
    bufferState: BufferState;
    exactSharesToIssue: bigint;
};

// Boosted add liquidity test
export type BoostedTest = TestBase & {
    testType: 'boosted';
    boostedPoolState: PoolStateWithUnderlyings;
    isNativeIn?: boolean; // Optional - whether to test with native input (WETH as ETH)
    // Input amounts for each test type
    unbalancedAmounts: InputAmount[]; // Required - amounts for unbalanced test
    proportionalBptOut: InputAmount; // Required - BPT amount for proportional test with BPT reference
    proportionalAmountIn: InputAmount; // Required - token amount for proportional test with token reference
    proportionalTokensIn: Address[]; // Required - tokens to use for proportional test
};

// Nested add liquidity test
export type NestedTest = TestBase & {
    testType: 'nested';
    nestedPoolState: NestedPoolState;
    isNativeIn?: boolean; // Optional - whether to test with native input (WETH as ETH)
    unbalancedAmounts: InputAmount[]; // Single test case input (unbalanced only)
};

// Discriminated union of all test types
export type Test = RegularTest | BufferTest | BoostedTest | NestedTest;

// Type guards
export function isRegularTest(test: Test): test is RegularTest {
    return test.testType === 'regular';
}

export function isBufferTest(test: Test): test is BufferTest {
    return test.testType === 'buffer';
}

export function isBoostedTest(test: Test): test is BoostedTest {
    return test.testType === 'boosted';
}

export function isNestedTest(test: Test): test is NestedTest {
    return test.testType === 'nested';
}

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
        testType: 'regular',
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
    {
        testType: 'buffer',
        name: 'Add Liquidity Buffer: USDC + stataUSDC',
        chainId: ChainId.SEPOLIA,
        anvilNetwork: ANVIL_NETWORKS.SEPOLIA,
        bufferState: {
            wrappedToken: {
                address:
                    '0x8a88124522dbbf1e56352ba3de1d9f78c143751e' as Address,
                decimals: 6,
            },
            underlyingToken: {
                address:
                    '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8' as Address,
                decimals: 6,
            },
        },
        exactSharesToIssue: 1000000n,
    },
    {
        testType: 'boosted',
        name: 'Add Liquidity Boosted: USDC + USDT Pool',
        chainId: ChainId.SEPOLIA,
        anvilNetwork: ANVIL_NETWORKS.SEPOLIA,
        boostedPoolState: {
            id: '0x59fa488dda749cdd41772bb068bb23ee955a6d7a',
            address: '0x59fa488dda749cdd41772bb068bb23ee955a6d7a',
            type: 'Stable',
            protocolVersion: 3,
            tokens: [
                {
                    index: 0,
                    address:
                        '0x8a88124522dbbf1e56352ba3de1d9f78c143751e' as Address,
                    decimals: 6,
                    underlyingToken: {
                        address:
                            '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8' as Address,
                        decimals: 6,
                        index: 0,
                    },
                },
                {
                    index: 1,
                    address:
                        '0x978206fae13faf5a8d293fb614326b237684b750' as Address,
                    decimals: 6,
                    underlyingToken: {
                        address:
                            '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0' as Address,
                        decimals: 6,
                        index: 1,
                    },
                },
            ],
        },
        unbalancedAmounts: [
            {
                address:
                    '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8' as Address, // USDC_AAVE (underlying)
                decimals: 6,
                rawAmount: 1000000n, // 1 USDC
            },
            {
                address:
                    '0x978206fae13faf5a8d293fb614326b237684b750' as Address, // stataUSDT (wrapped)
                decimals: 6,
                rawAmount: 2000000n, // 2 stataUSDT
            },
        ],
        proportionalBptOut: {
            address: '0x59fa488dda749cdd41772bb068bb23ee955a6d7a' as Address, // BPT
            decimals: 18,
            rawAmount: 1000000000000000000n, // 1 BPT
        },
        proportionalAmountIn: {
            address: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8' as Address, // USDC_AAVE
            decimals: 6,
            rawAmount: 481201n, // Reference amount from old test
        },
        proportionalTokensIn: [
            '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8' as Address, // USDC_AAVE
            '0x978206fae13faf5a8d293fb614326b237684b750' as Address, // stataUSDT
        ],
        blockNumber: 8069420n, // Specific block number for consistent pool state
    },
    {
        testType: 'boosted',
        name: 'Add Liquidity Partial Boosted: WETH + stataUSDT Pool',
        chainId: ChainId.SEPOLIA,
        anvilNetwork: ANVIL_NETWORKS.SEPOLIA,
        boostedPoolState: {
            id: '0x445A49D1Ad280B68026629fE029Ed0Fbef549a94',
            address: '0x445A49D1Ad280B68026629fE029Ed0Fbef549a94' as Address,
            type: 'Weighted',
            protocolVersion: 3,
            tokens: [
                {
                    index: 0,
                    address:
                        '0x7b79995e5f793a07bc00c21412e50ecae098e7f9' as Address, // WETH (no underlying)
                    decimals: 18,
                    underlyingToken: null,
                },
                {
                    index: 1,
                    address:
                        '0x978206fae13faf5a8d293fb614326b237684b750' as Address, // stataUSDT
                    decimals: 6,
                    underlyingToken: {
                        address:
                            '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0' as Address, // USDT_AAVE
                        decimals: 6,
                        index: 1,
                    },
                },
            ],
        },
        isNativeIn: true, // Partial boosted pools support native input (WETH)
        unbalancedAmounts: [
            {
                address:
                    '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0' as Address, // USDT_AAVE (underlying)
                decimals: 6,
                rawAmount: 1000000n, // 1 USDT
            },
            {
                address:
                    '0x7b79995e5f793a07bc00c21412e50ecae098e7f9' as Address, // WETH
                decimals: 18,
                rawAmount: 20000000000000000n, // 0.02 WETH
            },
        ],
        proportionalBptOut: {
            address: '0x445A49D1Ad280B68026629fE029Ed0Fbef549a94' as Address, // BPT
            decimals: 18,
            rawAmount: 1000000000000000000n, // 1 BPT
        },
        proportionalAmountIn: {
            address: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0' as Address, // USDT_AAVE
            decimals: 6,
            rawAmount: 1000000n, // 1 USDT
        },
        proportionalTokensIn: [
            '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0' as Address, // USDT_AAVE
            '0x7b79995e5f793a07bc00c21412e50ecae098e7f9' as Address, // WETH
        ],
        blockNumber: 8069420n, // Specific block number for consistent pool state
    },
    {
        testType: 'nested',
        name: 'Add Liquidity Nested: Nested with Boosted Pool',
        chainId: ChainId.SEPOLIA,
        anvilNetwork: ANVIL_NETWORKS.SEPOLIA,
        nestedPoolState: nestedWithBoostedPool,
        isNativeIn: true, // Support both native and non-native
        unbalancedAmounts: [
            {
                address:
                    '0x7b79995e5f793a07bc00c21412e50ecae098e7f9' as Address, // WETH
                decimals: 18,
                rawAmount: 1000000000000000n, // 0.001 WETH
            },
            {
                address:
                    '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8' as Address, // USDC_AAVE
                decimals: 6,
                rawAmount: 2000000n, // 2 USDC
            },
        ],
        blockNumber: 8069420n, // Specific block number for consistent pool state
    },
];
