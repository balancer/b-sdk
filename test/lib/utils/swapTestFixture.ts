import { Address, Hex, TestActions } from 'viem';
import { createTestClient, http, publicActions, walletActions } from 'viem';
import {
    CHAINS,
    ChainId,
    Path,
    PERMIT2,
    MAX_UINT256,
    PublicWalletClient,
    PermitDetails,
    getDetails,
    signPermit2,
    Permit2,
} from '@/index';
import { startFork } from '../../anvil/anvil-global-setup';
import {
    approveSpenderOnTokens,
    findTokenBalanceSlot,
    setTokenBalances,
    approveSpenderOnPermit2,
} from './helper';
import { TEST_CONSTANTS } from '../../entities/swaps/v3/swapTestConfig';
import type { Test } from '../../entities/swaps/v3/swapTestConfig';

/**
 * Sets up the fork and test client for integration tests.
 * Configures token approvals for Permit2 and creates a snapshot for test isolation.
 * @param test - The test configuration
 * @param jobId - Job ID for fork management
 * @returns Fork RPC URL, test client, and pre-approval snapshot
 */
export async function setupForkAndClient(
    test: Test,
    jobId: number,
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
    if (testAddressCheck !== TEST_CONSTANTS.ANVIL_TEST_ADDRESS) {
        throw Error('Test address mismatch');
    }

    // First step of permit2 flow - user approves Permit2 contract to spend input token (this is needed for direct or signature approval)
    await approveSpenderOnTokens(
        client,
        TEST_CONSTANTS.ANVIL_TEST_ADDRESS,
        [test.path.tokens[0].address],
        PERMIT2[test.chainId],
        [MAX_UINT256],
    );

    // Uses Special RPC methods to revert state back to same snapshot for each test
    // https://github.com/trufflesuite/ganache-cli-archive/blob/master/README.md
    const snapshotPreApprove = await client.snapshot();

    return { fork, client, snapshotPreApprove };
}

/**
 * Sets up Permit2 approval for the router.
 * Reverts to pre-approval snapshot, sets token balances, and approves router via Permit2.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param path - The swap path
 * @param routerAddress - Address of the router contract
 * @param snapshotPreApprove - Snapshot ID before permit2 approval
 * @returns New snapshot ID after permit2 approval setup
 */
export async function setupPermit2Approval(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    path: Path,
    routerAddress: Address,
    snapshotPreApprove: Hex,
): Promise<Hex> {
    // Revert to pre-approval snapshot
    await client.revert({
        id: snapshotPreApprove,
    });
    const newSnapshot = await client.snapshot();

    const slot = await findTokenBalanceSlot(
        client,
        testAddress,
        path.tokens[0].address,
    );

    await setTokenBalances(
        client,
        testAddress,
        [path.tokens[0].address],
        [slot],
        [path.inputAmountRaw * TEST_CONSTANTS.BALANCE_MULTIPLIER],
    );

    // Second step of permit2 flow - user Permit2 approves router to spend input token
    await approveSpenderOnPermit2(
        client,
        testAddress,
        path.tokens[0].address,
        routerAddress,
    );

    return newSnapshot;
}

/**
 * Sets up Permit2 signature approval for the router.
 * Sets token balances, approves router via Permit2, builds permit details, and signs.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param path - The swap path
 * @param routerAddress - Address of the router contract
 * @returns Permit2 signature and snapshot ID after setup
 */
export async function setupPermit2Signature(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    path: Path,
    routerAddress: Address,
): Promise<{
    permit2: Permit2;
    snapshot: Hex;
}> {
    const slot = await findTokenBalanceSlot(
        client,
        testAddress,
        path.tokens[0].address,
    );

    await setTokenBalances(
        client,
        testAddress,
        [path.tokens[0].address],
        [slot],
        [path.inputAmountRaw * TEST_CONSTANTS.BALANCE_MULTIPLIER],
    );

    await approveSpenderOnPermit2(
        client,
        testAddress,
        path.tokens[0].address,
        routerAddress,
    );

    // build permit details
    const details: PermitDetails[] = [
        await getDetails(
            client,
            path.tokens[0].address,
            testAddress,
            routerAddress,
        ),
    ];

    // sign permit2
    const permit2 = await signPermit2(
        client,
        testAddress,
        routerAddress,
        details,
    );

    const snapshot = await client.snapshot();

    return { permit2, snapshot };
}
