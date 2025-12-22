import {
    ChainId,
    Slippage,
    PoolState,
    InputAmount,
    Address,
    BufferState,
} from '@/index';
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

// Discriminated union of all test types
export type Test = RegularTest | BufferTest;

// Type guards
export function isRegularTest(test: Test): test is RegularTest {
    return test.testType === 'regular';
}

export function isBufferTest(test: Test): test is BufferTest {
    return test.testType === 'buffer';
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
];
