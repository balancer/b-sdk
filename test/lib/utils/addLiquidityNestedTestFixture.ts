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
    NestedPoolState,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED,
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
import type { NestedTest } from '../../v3/addLiquidity/addLiquidityTestConfig';
import { NetworkSetup } from '../../anvil/anvil-global-setup';

/**
 * Sets up the fork and test client for nested add liquidity integration tests.
 * Sets token balances for mainTokens and creates a snapshot.
 * @param test - The nested test configuration
 * @param jobId - Job ID for fork management
 * @param testAddress - The test address to use
 * @returns Fork RPC URL, test client, and pre-approval snapshot
 */
export async function setupForkAndClientV3Nested(
    test: NestedTest,
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

    // Set token balances for all mainTokens
    const mainTokenAddresses = test.nestedPoolState.mainTokens.map(
        (t) => t.address,
    );
    const mainTokenSlots = await Promise.all(
        mainTokenAddresses.map((token) =>
            findTokenBalanceSlot(client, testAddress, token),
        ),
    );

    const mainTokenBalances = test.nestedPoolState.mainTokens.map((t) =>
        parseUnits('1000', t.decimals),
    );

    await setTokenBalances(
        client,
        testAddress,
        mainTokenAddresses,
        mainTokenSlots,
        mainTokenBalances,
    );

    // First step of permit2 flow - user approves Permit2 contract to spend all mainTokens
    // (this is needed for direct or signature approval)
    await approveSpenderOnTokens(
        client,
        testAddress,
        mainTokenAddresses,
        PERMIT2[test.chainId],
        mainTokenAddresses.map(() => MAX_UINT256),
    );

    // Uses Special RPC methods to revert state back to same snapshot for each test
    const snapshotPreApprove = await client.snapshot();

    return { fork, client, snapshotPreApprove };
}

/**
 * Sets up Permit2 approval for the nested router for all mainTokens.
 * Reverts to pre-approval snapshot, sets token balances, and approves router via Permit2.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param nestedPoolState - The nested pool state
 * @param routerAddress - Address of the nested router contract
 * @param snapshotPreApprove - Snapshot ID before permit2 approval
 * @returns New snapshot ID after permit2 approval setup
 */
export async function setupPermit2ApprovalNested(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    nestedPoolState: NestedPoolState,
    routerAddress: Address,
    snapshotPreApprove: Hex,
): Promise<Hex> {
    // Revert to pre-approval snapshot
    await client.revert({
        id: snapshotPreApprove,
    });
    const newSnapshot = await client.snapshot();

    // Set balances for all mainTokens
    const mainTokenAddresses = nestedPoolState.mainTokens.map((t) => t.address);
    const slots = await Promise.all(
        mainTokenAddresses.map((token) =>
            findTokenBalanceSlot(client, testAddress, token),
        ),
    );

    // Set large balances for all mainTokens
    const balances = nestedPoolState.mainTokens.map((t) =>
        parseUnits('100000', t.decimals),
    );

    await setTokenBalances(
        client,
        testAddress,
        mainTokenAddresses,
        slots,
        balances,
    );

    // Second step of permit2 flow - user Permit2 approves router to spend all mainTokens
    for (const token of mainTokenAddresses) {
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
 * Sets up Permit2 signature approval for the nested router for all mainTokens.
 * Sets token balances, approves router via Permit2, builds permit details, and signs.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param nestedPoolState - The nested pool state
 * @param routerAddress - Address of the nested router contract
 * @returns Permit2 signature and snapshot ID after setup
 */
export async function setupPermit2SignatureNested(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    nestedPoolState: NestedPoolState,
    routerAddress: Address,
): Promise<{
    permit2: Permit2;
    snapshot: Hex;
}> {
    // Set balances for all mainTokens
    const mainTokenAddresses = nestedPoolState.mainTokens.map((t) => t.address);
    const slots = await Promise.all(
        mainTokenAddresses.map((token) =>
            findTokenBalanceSlot(client, testAddress, token),
        ),
    );

    // Set large balances for all mainTokens
    const balances = nestedPoolState.mainTokens.map((t) =>
        parseUnits('100000', t.decimals),
    );

    await setTokenBalances(
        client,
        testAddress,
        mainTokenAddresses,
        slots,
        balances,
    );

    // Approve router via Permit2 for all mainTokens
    for (const token of mainTokenAddresses) {
        await approveSpenderOnPermit2(
            client,
            testAddress,
            token,
            routerAddress,
        );
    }

    // Build permit details for all mainTokens
    const details: PermitDetails[] = await Promise.all(
        mainTokenAddresses.map((token) =>
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
 * Sets up native input balances for nested tests.
 * Sets balances for all mainTokens and permit2 approvals for non-WETH tokens.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param nestedPoolState - The nested pool state
 * @param chainId - The chain ID
 * @returns Snapshot ID after setup
 */
export async function setupNativeInputBalancesNested(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    nestedPoolState: NestedPoolState,
    chainId: ChainId,
): Promise<Hex> {
    // Find WETH token
    const wethAddress = NATIVE_ASSETS[chainId].wrapped;
    const hasWeth = nestedPoolState.mainTokens.some(
        (t) => t.address === wethAddress,
    );

    if (!hasWeth) {
        throw new Error('WETH token not found in nested pool mainTokens');
    }

    // Get router address for permit2 approvals
    const routerAddress = BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED[chainId];

    // Get slots and set balances for all mainTokens
    const mainTokenAddresses = nestedPoolState.mainTokens.map((t) => t.address);
    const slots = await Promise.all(
        mainTokenAddresses.map((token) =>
            findTokenBalanceSlot(client, testAddress, token),
        ),
    );

    // Set very large fixed balances for all mainTokens
    const balances = nestedPoolState.mainTokens.map((t) =>
        parseUnits('1000000', t.decimals),
    );

    await setTokenBalances(
        client,
        testAddress,
        mainTokenAddresses,
        slots,
        balances,
    );

    // Set up permit2 approvals for non-WETH tokens only
    // WETH is sent as native ETH when wethIsEth is true, so it doesn't need permit2 approval
    const nonWethTokens = mainTokenAddresses.filter(
        (token) => token !== wethAddress,
    );
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
