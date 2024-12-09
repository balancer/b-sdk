/**
 * Example showing how to add liquidity to a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/addLiquidity/addLiquidityBuffer.ts
 */
import {
    Address,
    createTestClient,
    erc20Abi,
    erc4626Abi,
    http,
    parseAbi,
    parseEther,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';
import {
    BalancerApi,
    ChainId,
    Slippage,
    TEST_API_ENDPOINT,
    CHAINS,
    PublicWalletClient,
    AddLiquidityBufferInput,
    AddLiquidityBufferV3,
    PERMIT2,
    BALANCER_BUFFER_ROUTER,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import {
    approveSpenderOnPermit2,
    approveSpenderOnTokens,
    sendTransactionGetBalances,
} from 'test/lib/utils';

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
    const chainId = ChainId.SEPOLIA;
    const wrappedTokenAddress =
        '0x8a88124522dbbf1e56352ba3de1d9f78c143751e' as Address;
    const underlyingTokenAddress =
        '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8' as Address;
    const slippage = Slippage.fromPercentage('1'); // 1%

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const userAccount = (await client.getAddresses())[0];

    // setup fork token balances
    const usdcAmount = 1000000000n;
    await mintUSDC(client, underlyingTokenAddress, userAccount, usdcAmount);

    const depositAmount = usdcAmount / 2n;
    await depositToStataUSDC(
        client,
        userAccount,
        underlyingTokenAddress,
        wrappedTokenAddress,
        depositAmount,
    );

    // build add liquidity buffer transaction data
    const call = await addLiquidityExample({
        rpcUrl,
        chainId,
        wrappedTokenAddress,
        exactSharesToIssue: 1000000n,
        slippage,
    });

    const tokensForBalanceCheck = [wrappedTokenAddress, underlyingTokenAddress];

    // approve permit2 to spend erc20 and erc4626 tokens
    await approveSpenderOnTokens(
        client,
        userAccount,
        tokensForBalanceCheck,
        PERMIT2[chainId],
    );

    // approve buffer router to spend erc20 and erc4626 tokens via permit2
    await approveSpenderOnPermit2(
        client,
        userAccount,
        wrappedTokenAddress,
        BALANCER_BUFFER_ROUTER[chainId],
    );
    await approveSpenderOnPermit2(
        client,
        userAccount,
        underlyingTokenAddress,
        BALANCER_BUFFER_ROUTER[chainId],
    );

    // send the transaction
    console.log('\nSending tx...');
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            tokensForBalanceCheck,
            client,
            userAccount,
            call.to,
            call.callData,
        );

    // check results
    if (transactionReceipt.status === 'reverted')
        throw Error('Transaction reverted');
    console.log('Token balance deltas:');
    console.table({
        tokensForBalanceCheck,
        balanceDeltas,
    });
}

export const addLiquidityExample = async ({
    rpcUrl,
    chainId,
    wrappedTokenAddress,
    exactSharesToIssue,
    slippage,
}: {
    rpcUrl: string;
    chainId: ChainId;
    wrappedTokenAddress: Address;
    exactSharesToIssue: bigint;
    slippage: Slippage;
}) => {
    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(TEST_API_ENDPOINT, chainId);
    const bufferState =
        await balancerApi.buffers.fetchBufferState(wrappedTokenAddress);

    // Construct the AddLiquidityBufferInput
    const addLiquidityBufferInput: AddLiquidityBufferInput = {
        chainId,
        rpcUrl,
        exactSharesToIssue,
    };

    // Simulate addLiquidity to get the amount of BPT out
    const addLiquidityBuffer = new AddLiquidityBufferV3();
    const queryOutput = await addLiquidityBuffer.query(
        addLiquidityBufferInput,
        bufferState,
    );

    console.log('\nAdd Liquidity Query Output:');
    console.log(`Wrapped In: ${queryOutput.wrappedAmountIn.amount.toString()}`);
    console.log(
        `Underlying In: ${queryOutput.underlyingAmountIn.amount.toString()}`,
    );
    console.log(
        `Exact Shares To Issue: ${queryOutput.exactSharesToIssue.toString()}`,
    );

    // Apply slippage to the BPT amount received from the query and construct the call
    const call = addLiquidityBuffer.buildCall({
        ...queryOutput,
        slippage,
    });

    console.log('\nWith slippage applied:');
    console.log(`Max Wrapped In: ${call.maxWrappedAmountIn.amount.toString()}`);
    console.log(
        `Max Underlying In: ${call.maxUnderlyingAmountIn.amount.toString()}`,
    );

    return call;
};

export default runAgainstFork;

// helper functions

const mintUSDC = async (
    client: PublicWalletClient & TestActions,
    underlyingTokenAddress: Address,
    userAccount: Address,
    amount: bigint,
) => {
    const usdcOwner = '0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D';
    await client.setBalance({
        address: usdcOwner,
        value: parseEther('1000'),
    });
    await client.impersonateAccount({
        address: usdcOwner,
    });

    const { request } = await client.simulateContract({
        abi: parseAbi([
            'function mint(address account, uint256 value) nonpayable returns (bool)',
        ]),
        address: underlyingTokenAddress,
        account: usdcOwner,
        functionName: 'mint',
        args: [userAccount, amount],
    });

    await client.writeContract(request);

    await client.stopImpersonatingAccount({
        address: usdcOwner,
    });
};

const depositToStataUSDC = async (
    client: PublicWalletClient & TestActions,
    userAccount: Address,
    underlyingTokenAddress: Address,
    wrappedTokenAddress: Address,
    depositAmount: bigint,
) => {
    await client.writeContract({
        account: userAccount,
        address: underlyingTokenAddress,
        abi: erc20Abi,
        chain: CHAINS[ChainId.SEPOLIA],
        functionName: 'approve',
        args: [wrappedTokenAddress, depositAmount],
    });

    await client.writeContract({
        abi: erc4626Abi,
        address: wrappedTokenAddress,
        account: userAccount,
        chain: CHAINS[ChainId.SEPOLIA],
        functionName: 'deposit',
        args: [depositAmount, userAccount],
    });
};
