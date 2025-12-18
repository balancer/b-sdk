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
import type { Test } from '../../entities/swaps/v3/swapTestConfig';
import type { TestV2 } from '../../entities/swaps/v2/swapTestConfig';
import { NetworkSetup } from '../../anvil/anvil-global-setup';

/**
 * Base type constraint for test configurations that can be used with setupForkAndClientBase.
 */
type TestConfigBase = {
    chainId: ChainId;
    anvilNetwork: NetworkSetup;
    blockNumber?: bigint;
    path: Path;
};

/**
 * Base function for setting up fork and test client.
 * Handles common setup logic shared between V2 and V3 tests.
 * @param test - The test configuration (Test or TestV2)
 * @param jobId - Job ID for fork management
 * @param testAddress - The expected test address to validate
 * @param setupApprovals - Optional function to run approval setup before snapshot
 * @returns Fork RPC URL, test client, and pre-approval snapshot
 */
async function setupForkAndClientBase<T extends TestConfigBase>(
    test: T,
    jobId: number,
    testAddress: Address,
    setupApprovals?: (
        client: PublicWalletClient & TestActions,
        test: T,
        testAddress: Address,
    ) => Promise<void>,
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

    // Run optional approval setup (e.g., Permit2 for V3)
    if (setupApprovals) {
        await setupApprovals(client, test, testAddress);
    }

    // Uses Special RPC methods to revert state back to same snapshot for each test
    // https://github.com/trufflesuite/ganache-cli-archive/blob/master/README.md
    const snapshotPreApprove = await client.snapshot();

    return { fork, client, snapshotPreApprove };
}

/**
 * Sets up the fork and test client for integration tests.
 * Configures token approvals for Permit2 and creates a snapshot for test isolation.
 * @param test - The test configuration
 * @param jobId - Job ID for fork management
 * @param testAddress - The test address to use for approvals
 * @returns Fork RPC URL, test client, and pre-approval snapshot
 */
export async function setupForkAndClientV3(
    test: Test,
    jobId: number,
    testAddress: Address,
): Promise<{
    fork: { rpcUrl: string };
    client: PublicWalletClient & TestActions;
    snapshotPreApprove: Hex;
}> {
    return setupForkAndClientBase(
        test,
        jobId,
        testAddress,
        async (client, test, testAddress) => {
            // First step of permit2 flow - user approves Permit2 contract to spend input token (this is needed for direct or signature approval)
            await approveSpenderOnTokens(
                client,
                testAddress,
                [test.path.tokens[0].address],
                PERMIT2[test.chainId],
                [MAX_UINT256],
            );
        },
    );
}

/**
 * Sets up Permit2 approval for the router.
 * Reverts to pre-approval snapshot, sets token balances, and approves router via Permit2.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param path - The swap path
 * @param routerAddress - Address of the router contract
 * @param snapshotPreApprove - Snapshot ID before permit2 approval
 * @param balanceMultiplier - Multiplier for setting token balances
 * @returns New snapshot ID after permit2 approval setup
 */
export async function setupPermit2Approval(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    path: Path,
    routerAddress: Address,
    snapshotPreApprove: Hex,
    balanceMultiplier: bigint,
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
        [path.inputAmountRaw * balanceMultiplier],
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
 * @param balanceMultiplier - Multiplier for setting token balances
 * @returns Permit2 signature and snapshot ID after setup
 */
export async function setupPermit2Signature(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    path: Path,
    routerAddress: Address,
    balanceMultiplier: bigint,
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
        [path.inputAmountRaw * balanceMultiplier],
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

/**
 * Sets up the fork and test client for V2 integration tests.
 * Configures the test client and creates a snapshot for test isolation.
 * @param test - The V2 test configuration
 * @param jobId - Job ID for fork management
 * @param testAddress - The test address to use for validation
 * @returns Fork RPC URL, test client, and pre-approval snapshot
 */
export async function setupForkAndClientV2(
    test: TestV2,
    jobId: number,
    testAddress: Address,
): Promise<{
    fork: { rpcUrl: string };
    client: PublicWalletClient & TestActions;
    snapshotPreApprove: Hex;
}> {
    return setupForkAndClientBase(
        test,
        jobId,
        testAddress,
        // No approval setup needed for V2
    );
}

/**
 * Sets up V2 approval for the vault.
 * Reverts to pre-approval snapshot, sets token balance for input token, and approves VAULT_V2.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param path - The swap path
 * @param vaultAddress - Address of the VAULT_V2 contract
 * @param balanceMultiplier - Multiplier for setting token balances
 * @returns New snapshot ID after approval setup
 */
export async function setupV2Approval(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    path: Path,
    vaultAddress: Address,
    balanceMultiplier: bigint,
): Promise<Hex> {
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
        [path.inputAmountRaw * balanceMultiplier],
    );

    // Approve VAULT_V2 to spend input token directly (V2 doesn't use Permit2)
    await approveSpenderOnTokens(
        client,
        testAddress,
        [path.tokens[0].address],
        vaultAddress,
        [MAX_UINT256],
    );

    const snapshot = await client.snapshot();

    return snapshot;
}
