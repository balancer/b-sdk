/**
 * Example showing how to add liquidity to a pool from a V3 nested pool.
 * Uses direct ERC20 approvals. Signature method can be seen in tests.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/addLiquidity/addLiquidityNested.V3.ts
 */
import {
    createTestClient,
    http,
    parseEther,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';
import {
    Address,
    BalancerApi,
    ChainId,
    CHAINS,
    Slippage,
    AddLiquidityNested,
    AddLiquidityNestedInput,
    TEST_API_ENDPOINT,
    PERMIT2,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
} from '../../src';
import {
    ANVIL_NETWORKS,
    NetworkSetup,
    startFork,
} from '../../test/anvil/anvil-global-setup';
import { getSlot } from 'examples/lib/getSlot';
import {
    approveSpenderOnPermit2,
    approveSpenderOnToken,
    sendTransactionGetBalances,
    setTokenBalances,
} from 'test/lib/utils';

const addLiquidityNested = async () => {
    // User defined inputs
    const chainId = ChainId.SEPOLIA;
    // WETH-BOOSTED-USD Pool
    const pool = {
        id: '0x0270daf4ee12ccb1abc8aa365054eecb1b7f4f6b',
        address: '0x0270daf4ee12ccb1abc8aa365054eecb1b7f4f6b' as Address,
    };

    const amountsIn = [
        // USDT
        {
            rawAmount: parseUnits('19', 6),
            decimals: 6,
            address: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8' as Address,
        },
        // WETH
        {
            rawAmount: parseEther('0.001'),
            decimals: 18,
            address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9' as Address,
        },
    ];
    const slippage = Slippage.fromPercentage('1'); // 1%

    // This sets up a local fork with a test client/account
    const { rpcUrl, client } = await setup(chainId, ANVIL_NETWORKS.SEPOLIA);
    const userAccount = (await client.getAddresses())[0];

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(TEST_API_ENDPOINT, chainId);
    const nestedPoolState = await balancerApi.nestedPools.fetchNestedPoolState(
        pool.id,
    );

    // setup add liquidity helper
    const addLiquidityNested = new AddLiquidityNested();

    const addLiquidityInput: AddLiquidityNestedInput = {
        amountsIn,
        chainId,
        rpcUrl,
    };

    // TODO - Add back once V3 support
    // Calculate price impact to ensure it's acceptable
    // const priceImpact = await PriceImpact.addLiquidityNested(
    //     addLiquidityInput,
    //     nestedPoolState,
    // );
    // console.log(`\nPrice Impact: ${priceImpact.percentage.toFixed(2)}%`);

    const queryOutput = await addLiquidityNested.query(
        addLiquidityInput,
        nestedPoolState,
    );

    console.log('\nAdd Liquidity Query Output:');
    console.table({
        tokensIn: queryOutput.amountsIn.map((a) => a.token.address),
        amountsIn: queryOutput.amountsIn.map((a) => a.amount),
    });
    console.log(`BPT Out: ${queryOutput.bptOut.amount.toString()}`);

    const call = addLiquidityNested.buildCall(
        addLiquidityNested.buildAddLiquidityInput(queryOutput, {
            slippage,
        }),
    );

    console.log('\nWith slippage applied:');
    console.log(`Min BPT Out: ${call.minBptOut.toString()}`);

    await setTokenBalances(
        client,
        userAccount,
        queryOutput.amountsIn.map((t) => t.token.address),
        queryOutput.amountsIn.map((a) => getSlot(chainId, a.token.address)),
        queryOutput.amountsIn.map((a) => a.amount),
    );

    for (const amount of queryOutput.amountsIn) {
        // Approve Permit2 to spend account tokens
        await approveSpenderOnToken(
            client,
            userAccount,
            amount.token.address,
            PERMIT2[chainId],
        );
        // Approve Router to spend account tokens using Permit2
        await approveSpenderOnPermit2(
            client,
            userAccount,
            amount.token.address,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        );
    }

    // send add liquidity transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                ...queryOutput.amountsIn.map((t) => t.token.address),
                queryOutput.bptOut.token.address,
            ],
            client,
            userAccount,
            call.to,
            call.callData,
        );

    console.log(transactionReceipt.status);
    console.log(balanceDeltas);
};

async function setup(chainId: ChainId, network: NetworkSetup) {
    const { rpcUrl } = await startFork(network);

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);
    return {
        client,
        rpcUrl,
    };
}

export default addLiquidityNested;
