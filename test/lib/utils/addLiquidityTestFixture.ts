import { Address, Hex, TestActions, parseUnits } from 'viem';
import { createTestClient, http, publicActions, walletActions } from 'viem';
import {
    CHAINS,
    ChainId,
    PERMIT2,
    MAX_UINT256,
    PublicWalletClient,
    PermitDetails,
    getDetails,
    signPermit2,
    Permit2,
    PoolState,
    NATIVE_ASSETS,
    AddressProvider,
} from '@/index';
import { startFork } from '../../anvil/anvil-global-setup';
import {
    approveSpenderOnTokens,
    findTokenBalanceSlot,
    setTokenBalances,
    approveSpenderOnPermit2,
} from './helper';
import type { RegularTest } from '../../v3/addLiquidity/addLiquidityTestConfig';
import { NetworkSetup } from '../../anvil/anvil-global-setup';
import { InputAmount } from '@/index';

/**
 * Sets up the fork and test client for add liquidity integration tests.
 * Configures token approvals for Permit2 for all pool tokens and creates a snapshot for test isolation.
 * @param test - The test configuration
 * @param jobId - Job ID for fork management
 * @param testAddress - The test address to use for approvals
 * @returns Fork RPC URL, test client, and pre-approval snapshot
 */
export async function setupForkAndClientV3(
    test: RegularTest,
    jobId: number,
    testAddress: Address,
): Promise<{
    fork: { rpcUrl: string };
    client: PublicWalletClient & TestActions;
    snapshotPreApprove: Hex;
}> {
    const fork = await startFork(test.anvilNetwork, jobId, test.blockNumber);
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[test.chainId],
        transport: http(fork.rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const testAddressCheck = (await client.getAddresses())[0];
    if (testAddressCheck !== testAddress) {
        throw Error('Test address mismatch');
    }

    // First step of permit2 flow - user approves Permit2 contract to spend all pool tokens
    // (this is needed for direct or signature approval)
    const poolTokens = test.poolState.tokens.map((t) => t.address);
    await approveSpenderOnTokens(
        client,
        testAddress,
        poolTokens,
        PERMIT2[test.chainId],
        poolTokens.map(() => MAX_UINT256),
    );

    // Uses Special RPC methods to revert state back to same snapshot for each test
    const snapshotPreApprove = await client.snapshot();

    return { fork, client, snapshotPreApprove };
}

/**
 * Sets up Permit2 approval for the router for all pool tokens.
 * Reverts to pre-approval snapshot, sets token balances, and approves router via Permit2.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param poolState - The pool state
 * @param routerAddress - Address of the router contract
 * @param snapshotPreApprove - Snapshot ID before permit2 approval
 * @param balanceMultiplier - Multiplier for setting token balances
 * @param amountsIn - The amounts to set for each token (for unbalanced tests)
 * @returns New snapshot ID after permit2 approval setup
 */
export async function setupPermit2Approval(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    poolState: PoolState,
    routerAddress: Address,
    snapshotPreApprove: Hex,
): Promise<Hex> {
    // Revert to pre-approval snapshot
    await client.revert({
        id: snapshotPreApprove,
    });
    const newSnapshot = await client.snapshot();

    // Get slots and set balances for all pool tokens
    const tokens = poolState.tokens.map((t) => t.address);
    const slots = await Promise.all(
        tokens.map((token) => findTokenBalanceSlot(client, testAddress, token)),
    );

    // Set very large fixed balances for all tokens to ensure sufficient balance for any test scenario
    // This is necessary because proportional tests may require different amounts than unbalanced tests
    // Proportional tests with amountIn can require very large amounts based on pool balance ratios
    const balances = poolState.tokens.map(
        (token) => parseUnits('1000000', token.decimals), // 1M tokens to handle large proportional calculations
    );

    await setTokenBalances(client, testAddress, tokens, slots, balances);

    // Second step of permit2 flow - user Permit2 approves router to spend all pool tokens
    for (const token of tokens) {
        await approveSpenderOnPermit2(
            client,
            testAddress,
            token,
            routerAddress,
        );
    }

    return newSnapshot;
}

/**
 * Sets up Permit2 signature approval for the router for all pool tokens.
 * Sets token balances, approves router via Permit2, builds permit details, and signs.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param poolState - The pool state
 * @param routerAddress - Address of the router contract
 * @param balanceMultiplier - Multiplier for setting token balances
 * @param amountsIn - The amounts to set for each token (for unbalanced tests)
 * @returns Permit2 signature and snapshot ID after setup
 */
export async function setupPermit2Signature(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    poolState: PoolState,
    routerAddress: Address,
): Promise<{
    permit2: Permit2;
    snapshot: Hex;
}> {
    // Get slots and set balances for all pool tokens
    const tokens = poolState.tokens.map((t) => t.address);
    const slots = await Promise.all(
        tokens.map((token) => findTokenBalanceSlot(client, testAddress, token)),
    );

    // Set very large fixed balances for all tokens to ensure sufficient balance for any test scenario
    // This is necessary because proportional tests may require different amounts than unbalanced tests
    // Proportional tests with amountIn can require very large amounts based on pool balance ratios
    const balances = poolState.tokens.map(
        (token) => parseUnits('1000000', token.decimals), // 1M tokens to handle large proportional calculations
    );

    await setTokenBalances(client, testAddress, tokens, slots, balances);

    // Approve router via Permit2 for all pool tokens
    for (const token of tokens) {
        await approveSpenderOnPermit2(
            client,
            testAddress,
            token,
            routerAddress,
        );
    }

    // Build permit details for all pool tokens
    const details: PermitDetails[] = await Promise.all(
        tokens.map((token) =>
            getDetails(client, token, testAddress, routerAddress),
        ),
    );

    // Sign permit2
    const permit2 = await signPermit2(
        client,
        testAddress,
        routerAddress,
        details,
    );

    const snapshot = await client.snapshot();

    return { permit2, snapshot };
}

/**
 * Sets up token balances for native input tests.
 * Sets balances for all tokens and permit2 approvals for non-WETH tokens.
 * When wethIsEth is true, WETH is sent as native ETH and doesn't need permit2 approval,
 * but other tokens still need permit2 approvals.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param poolState - The pool state
 * @param chainId - The chain ID
 * @param amountsIn - The amounts to set for each token
 * @param balanceMultiplier - Multiplier for setting token balances
 * @returns Snapshot ID after setup
 */
export async function setupNativeInputBalances(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    poolState: PoolState,
    chainId: ChainId,
): Promise<Hex> {
    // Find WETH token
    const wethAddress = NATIVE_ASSETS[chainId].wrapped;
    const wethToken = poolState.tokens.find((t) => t.address === wethAddress);

    if (!wethToken) {
        throw new Error('WETH token not found in pool state');
    }

    // Get router address for permit2 approvals
    const routerAddress = AddressProvider.Router(chainId);

    // Get slots and set balances for all pool tokens
    const tokens = poolState.tokens.map((t) => t.address);
    const slots = await Promise.all(
        tokens.map((token) => findTokenBalanceSlot(client, testAddress, token)),
    );

    // Set very large fixed balances for all tokens to ensure sufficient balance for any test scenario
    // This is necessary because proportional tests may require different amounts than unbalanced tests
    // Proportional tests with amountIn can require very large amounts based on pool balance ratios
    const balances = poolState.tokens.map(
        (token) => parseUnits('1000000', token.decimals), // 1M tokens to handle large proportional calculations
    );

    await setTokenBalances(client, testAddress, tokens, slots, balances);

    // Set up permit2 approvals for non-WETH tokens only
    // WETH is sent as native ETH when wethIsEth is true, so it doesn't need permit2 approval
    const nonWethTokens = tokens.filter((token) => token !== wethAddress);
    for (const token of nonWethTokens) {
        await approveSpenderOnPermit2(
            client,
            testAddress,
            token,
            routerAddress,
        );
    }

    const snapshot = await client.snapshot();

    return snapshot;
}
