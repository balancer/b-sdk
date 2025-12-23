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
    PoolStateWithUnderlyings,
    AddressProvider,
    NATIVE_ASSETS,
} from '@/index';
import { startFork } from '../../anvil/anvil-global-setup';
import {
    approveSpenderOnTokens,
    findTokenBalanceSlot,
    setTokenBalances,
    approveSpenderOnPermit2,
} from './helper';
import type { BoostedTest } from '../../v3/addLiquidity/addLiquidityTestConfig';
import { NetworkSetup } from '../../anvil/anvil-global-setup';

/**
 * Sets up the fork and test client for boosted add liquidity integration tests.
 * Sets token balances, deposits underlying tokens to wrapped tokens (ERC4626), and creates a snapshot.
 * @param test - The boosted test configuration
 * @param jobId - Job ID for fork management
 * @param testAddress - The test address to use
 * @returns Fork RPC URL, test client, and pre-approval snapshot
 */
export async function setupForkAndClientV3Boosted(
    test: BoostedTest,
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

    // Collect all underlying tokens that need deposits
    const underlyingTokens: Array<{
        address: Address;
        decimals: number;
        wrappedToken: Address;
    }> = [];

    for (const token of test.boostedPoolState.tokens) {
        if (token.underlyingToken) {
            underlyingTokens.push({
                address: token.underlyingToken.address,
                decimals: token.underlyingToken.decimals,
                wrappedToken: token.address,
            });
        }
    }

    // Set token balances for underlying tokens
    for (const underlyingToken of underlyingTokens) {
        const underlyingTokenSlot = await findTokenBalanceSlot(
            client,
            testAddress,
            underlyingToken.address,
        );

        await setTokenBalances(
            client,
            testAddress,
            [underlyingToken.address],
            [underlyingTokenSlot],
            [parseUnits('100000', underlyingToken.decimals)],
        );

        // Approve wrapped token (ERC4626) to spend underlying token
        await approveSpenderOnTokens(
            client,
            testAddress,
            [underlyingToken.address],
            underlyingToken.wrappedToken,
        );

        // Deposit underlying token to wrapped token (ERC4626)
        await client.writeContract({
            account: testAddress,
            chain: CHAINS[test.chainId],
            abi: erc4626Abi,
            address: underlyingToken.wrappedToken,
            functionName: 'deposit',
            args: [parseUnits('10000', underlyingToken.decimals), testAddress],
        });
    }

    // Set token balances for wrapped tokens that don't have underlying tokens
    const wrappedTokensWithoutUnderlying = test.boostedPoolState.tokens
        .filter((token) => !token.underlyingToken)
        .map((token) => ({
            address: token.address,
            decimals: token.decimals,
        }));

    for (const wrappedToken of wrappedTokensWithoutUnderlying) {
        const wrappedTokenSlot = await findTokenBalanceSlot(
            client,
            testAddress,
            wrappedToken.address,
        );

        await setTokenBalances(
            client,
            testAddress,
            [wrappedToken.address],
            [wrappedTokenSlot],
            [parseUnits('100000', wrappedToken.decimals)],
        );
    }

    // First step of permit2 flow - user approves Permit2 contract to spend all tokens
    // (both wrapped and underlying tokens - this is needed for direct or signature approval)
    const allTokens: Address[] = [];
    for (const token of test.boostedPoolState.tokens) {
        allTokens.push(token.address);
        if (token.underlyingToken) {
            allTokens.push(token.underlyingToken.address);
        }
    }
    await approveSpenderOnTokens(
        client,
        testAddress,
        allTokens,
        PERMIT2[test.chainId],
        allTokens.map(() => MAX_UINT256),
    );

    // Uses Special RPC methods to revert state back to same snapshot for each test
    const snapshotPreApprove = await client.snapshot();

    return { fork, client, snapshotPreApprove };
}

/**
 * Sets up native input balances for boosted tests.
 * Sets balances for all tokens (including underlying tokens) and permit2 approvals for non-WETH tokens.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param boostedPoolState - The boosted pool state
 * @param chainId - The chain ID
 * @returns Snapshot ID after setup
 */
export async function setupNativeInputBalancesBoosted(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    boostedPoolState: PoolStateWithUnderlyings,
    chainId: ChainId,
): Promise<Hex> {
    // Find WETH token (could be wrapped or underlying)
    const wethAddress = NATIVE_ASSETS[chainId].wrapped;
    const hasWeth = boostedPoolState.tokens.some(
        (t) =>
            t.address === wethAddress ||
            t.underlyingToken?.address === wethAddress,
    );

    if (!hasWeth) {
        throw new Error('WETH token not found in boosted pool state');
    }

    // Get router address for permit2 approvals
    const routerAddress = AddressProvider.CompositeLiquidityRouter(chainId);

    // Collect all tokens that need balances (wrapped tokens and underlying tokens)
    const tokensToSetBalance: Array<{ address: Address; decimals: number }> =
        [];

    for (const token of boostedPoolState.tokens) {
        // Add wrapped token
        tokensToSetBalance.push({
            address: token.address,
            decimals: token.decimals,
        });

        // Add underlying token if it exists
        if (token.underlyingToken) {
            tokensToSetBalance.push({
                address: token.underlyingToken.address,
                decimals: token.underlyingToken.decimals,
            });
        }
    }

    // Get slots and set balances for all tokens
    const tokenAddresses = tokensToSetBalance.map((t) => t.address);
    const slots = await Promise.all(
        tokenAddresses.map((token) =>
            findTokenBalanceSlot(client, testAddress, token),
        ),
    );

    // Set very large fixed balances for all tokens
    const balances = tokensToSetBalance.map((token) =>
        parseUnits('1000000', token.decimals),
    );

    await setTokenBalances(
        client,
        testAddress,
        tokenAddresses,
        slots,
        balances,
    );

    // Set up permit2 approvals for non-WETH tokens only
    // WETH is sent as native ETH when wethIsEth is true, so it doesn't need permit2 approval
    const nonWethTokens = tokenAddresses.filter(
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

/**
 * Sets up Permit2 approval for the boosted router for all tokens.
 * Reverts to pre-approval snapshot, sets token balances, and approves router via Permit2.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param boostedPoolState - The boosted pool state
 * @param routerAddress - Address of the boosted router contract
 * @param snapshotPreApprove - Snapshot ID before permit2 approval
 * @returns New snapshot ID after permit2 approval setup
 */
export async function setupPermit2ApprovalBoosted(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    boostedPoolState: PoolStateWithUnderlyings,
    routerAddress: Address,
    snapshotPreApprove: Hex,
): Promise<Hex> {
    // Revert to pre-approval snapshot
    await client.revert({
        id: snapshotPreApprove,
    });
    const newSnapshot = await client.snapshot();

    // Collect all tokens (wrapped and underlying)
    const allTokens: Address[] = [];
    for (const token of boostedPoolState.tokens) {
        allTokens.push(token.address);
        if (token.underlyingToken) {
            allTokens.push(token.underlyingToken.address);
        }
    }

    const slots = await Promise.all(
        allTokens.map((token) =>
            findTokenBalanceSlot(client, testAddress, token),
        ),
    );

    // Set large balances for all tokens
    const balances = allTokens.map((token) => {
        const poolToken = boostedPoolState.tokens.find(
            (t) =>
                t.address.toLowerCase() === token.toLowerCase() ||
                t.underlyingToken?.address.toLowerCase() ===
                    token.toLowerCase(),
        );
        const decimals =
            poolToken?.address.toLowerCase() === token.toLowerCase()
                ? poolToken.decimals
                : (poolToken?.underlyingToken?.decimals ?? 18);
        return parseUnits('100000', decimals);
    });

    await setTokenBalances(client, testAddress, allTokens, slots, balances);

    // Second step of permit2 flow - user Permit2 approves router to spend all tokens
    for (const token of allTokens) {
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
 * Sets up Permit2 signature approval for the boosted router for all tokens.
 * Sets token balances, approves router via Permit2, builds permit details, and signs.
 * @param client - The test client
 * @param testAddress - Address of the test account
 * @param boostedPoolState - The boosted pool state
 * @param routerAddress - Address of the boosted router contract
 * @returns Permit2 signature and snapshot ID after setup
 */
export async function setupPermit2SignatureBoosted(
    client: PublicWalletClient & TestActions,
    testAddress: Address,
    boostedPoolState: PoolStateWithUnderlyings,
    routerAddress: Address,
): Promise<{
    permit2: Permit2;
    snapshot: Hex;
}> {
    // Collect all tokens (wrapped and underlying)
    const allTokens: Address[] = [];
    for (const token of boostedPoolState.tokens) {
        allTokens.push(token.address);
        if (token.underlyingToken) {
            allTokens.push(token.underlyingToken.address);
        }
    }

    const slots = await Promise.all(
        allTokens.map((token) =>
            findTokenBalanceSlot(client, testAddress, token),
        ),
    );

    // Set large balances for all tokens
    const balances = allTokens.map((token) => {
        const poolToken = boostedPoolState.tokens.find(
            (t) =>
                t.address.toLowerCase() === token.toLowerCase() ||
                t.underlyingToken?.address.toLowerCase() ===
                    token.toLowerCase(),
        );
        const decimals =
            poolToken?.address.toLowerCase() === token.toLowerCase()
                ? poolToken.decimals
                : (poolToken?.underlyingToken?.decimals ?? 18);
        return parseUnits('100000', decimals);
    });

    await setTokenBalances(client, testAddress, allTokens, slots, balances);

    // Approve router via Permit2 for all tokens
    for (const token of allTokens) {
        await approveSpenderOnPermit2(
            client,
            testAddress,
            token,
            routerAddress,
        );
    }

    // Build permit details for all tokens
    const details: PermitDetails[] = await Promise.all(
        allTokens.map((token) =>
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
