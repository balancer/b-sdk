import { Address, Hex, TestActions, parseUnits, erc4626Abi } from 'viem';
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
    BufferState,
    AddressProvider,
} from '@/index';
import { startFork } from '../../anvil/anvil-global-setup';
import {
    approveSpenderOnTokens,
    findTokenBalanceSlot,
    setTokenBalance,
    setTokenBalances,
    approveSpenderOnPermit2,
} from './helper';
import type { BufferTest } from '../../v3/addLiquidity/addLiquidityTestConfig';
import { NetworkSetup } from '../../anvil/anvil-global-setup';

/**
 * Sets up the fork and test client for buffer add liquidity integration tests.
 * Sets token balances, deposits underlying token to wrapped token (ERC4626), and creates a snapshot.
 * @param test - The buffer test configuration
 * @param jobId - Job ID for fork management
 * @param testAddress - The test address to use
 * @returns Fork RPC URL, test client, and pre-approval snapshot
 */
export async function setupForkAndClientV3Buffer(
    test: BufferTest,
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

    // Set token balance for underlying token
    // Use findTokenBalanceSlot to dynamically find the slot (like the old test did)
    const underlyingToken = test.bufferState.underlyingToken;
    const underlyingTokenSlot = await findTokenBalanceSlot(
        client,
        testAddress,
        underlyingToken.address,
    );

    await setTokenBalance(
        client,
        testAddress,
        underlyingToken.address,
        underlyingTokenSlot,
        parseUnits('100000', underlyingToken.decimals),
    );

    // Approve wrapped token (ERC4626) to spend underlying token
    await approveSpenderOnTokens(
        client,
        testAddress,
        [underlyingToken.address],
        test.bufferState.wrappedToken.address,
    );

    // Deposit underlying token to wrapped token (ERC4626)
    await client.writeContract({
        account: testAddress,
        chain: CHAINS[test.chainId],
        abi: erc4626Abi,
        address: test.bufferState.wrappedToken.address,
        functionName: 'deposit',
        args: [parseUnits('10000', underlyingToken.decimals), testAddress],
    });

    // First step of permit2 flow - user approves Permit2 contract to spend wrapped and underlying tokens
    // (this is needed for direct or signature approval)
    const bufferTokens = [
        test.bufferState.wrappedToken.address,
        test.bufferState.underlyingToken.address,
    ];
    await approveSpenderOnTokens(
        client,
        testAddress,
        bufferTokens,
        PERMIT2[test.chainId],
        bufferTokens.map(() => MAX_UINT256),
    );

    // Uses Special RPC methods to revert state back to same snapshot for each test
    const snapshotPreApprove = await client.snapshot();

    return { fork, client, snapshotPreApprove };
}

/**
 * Sets up Permit2 approval for the buffer router for wrapped and underlying tokens.
 * Reverts to pre-approval snapshot, sets token balances, and approves router via Permit2.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param bufferState - The buffer state
 * @param routerAddress - Address of the buffer router contract
 * @param snapshotPreApprove - Snapshot ID before permit2 approval
 * @returns New snapshot ID after permit2 approval setup
 */
export async function setupPermit2ApprovalBuffer(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    bufferState: BufferState,
    routerAddress: Address,
    snapshotPreApprove: Hex,
): Promise<Hex> {
    // Revert to pre-approval snapshot
    await client.revert({
        id: snapshotPreApprove,
    });
    const newSnapshot = await client.snapshot();

    // Set balances for wrapped and underlying tokens
    const tokens = [
        bufferState.wrappedToken.address,
        bufferState.underlyingToken.address,
    ];
    const slots = await Promise.all(
        tokens.map((token) => findTokenBalanceSlot(client, testAddress, token)),
    );

    // Set large balances for both tokens
    const balances = [
        parseUnits('100000', bufferState.wrappedToken.decimals),
        parseUnits('100000', bufferState.underlyingToken.decimals),
    ];

    // Set token balances
    await setTokenBalances(
        client,
        testAddress,
        tokens,
        slots,
        balances,
    );

    // Second step of permit2 flow - user Permit2 approves router to spend wrapped and underlying tokens
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
 * Sets up Permit2 signature approval for the buffer router for wrapped and underlying tokens.
 * Sets token balances, approves router via Permit2, builds permit details, and signs.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param bufferState - The buffer state
 * @param routerAddress - Address of the buffer router contract
 * @returns Permit2 signature and snapshot ID after setup
 */
export async function setupPermit2SignatureBuffer(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    bufferState: BufferState,
    routerAddress: Address,
): Promise<{
    permit2: Permit2;
    snapshot: Hex;
}> {
    // Set balances for wrapped and underlying tokens
    const tokens = [
        bufferState.wrappedToken.address,
        bufferState.underlyingToken.address,
    ];
    const slots = await Promise.all(
        tokens.map((token) => findTokenBalanceSlot(client, testAddress, token)),
    );

    // Set large balances for both tokens
    const balances = [
        parseUnits('100000', bufferState.wrappedToken.decimals),
        parseUnits('100000', bufferState.underlyingToken.decimals),
    ];

    // Set token balances
    await setTokenBalances(
        client,
        testAddress,
        tokens,
        slots,
        balances,
    );

    // Approve router via Permit2 for wrapped and underlying tokens
    for (const token of tokens) {
        await approveSpenderOnPermit2(
            client,
            testAddress,
            token,
            routerAddress,
        );
    }

    // Build permit details for wrapped and underlying tokens
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

