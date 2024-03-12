/**
 * Example showing how to remove liquidity to a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/removeLiquidityNested.ts
 */

import { config } from 'dotenv';
config();

import {
    Client,
    createTestClient,
    http,
    parseUnits,
    PublicActions,
    publicActions,
    TestActions,
    WalletActions,
    walletActions,
} from 'viem';

import {
    Address,
    BALANCER_RELAYER,
    BalancerApi,
    ChainId,
    CHAINS,
    NestedPoolState,
    PriceImpact,
    Relayer,
    replaceWrapped,
    Slippage,
    RemoveLiquidityNested,
    RemoveLiquidityNestedSingleTokenInput,
} from '../src';
import { forkSetup, sendTransactionGetBalances } from '../test/lib/utils';
import { ANVIL_NETWORKS, startFork } from '../test/anvil/anvil-global-setup';

const balancerApiUrl = 'https://backend-v3-canary.beets-ftm-node.com/graphql';
const poolId =
    '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0'; // WETH-3POOL
const chainId = ChainId.MAINNET;

const removeLiquidityNested = async () => {
    // User approve vault to spend their tokens and update user balance
    const { client, accountAddress, nestedPoolState, rpcUrl } =
        await exampleSetup();

    // setup remove liquidity helper
    const removeLiquidityNested = new RemoveLiquidityNested();

    const bptAmountIn = parseUnits('1', 18);
    const tokenOut = '0x6b175474e89094c44da98b954eedeac495271d0f' as Address; // DAI

    const removeLiquidityInput: RemoveLiquidityNestedSingleTokenInput = {
        bptAmountIn,
        chainId,
        rpcUrl,
        tokenOut,
    };

    // Calculate price impact to ensure it's acceptable
    const priceImpact = await PriceImpact.removeLiquidityNested(
        removeLiquidityInput,
        nestedPoolState,
    );
    console.log(`\nPrice Impact: ${priceImpact.percentage.toFixed(2)}%`);

    const queryOutput = await removeLiquidityNested.query(
        removeLiquidityInput,
        nestedPoolState,
    );

    console.log('\nRemove Liquidity Query Output:');
    console.table({
        tokensOut: queryOutput.amountsOut.map((a) => a.token.address),
        amountsOut: queryOutput.amountsOut.map((a) => a.amount),
    });
    console.log(`BPT In: ${queryOutput.bptAmountIn.amount.toString()}`);

    // build remove liquidity nested call with expected minAmountsOut based on slippage
    const slippage = Slippage.fromPercentage('1'); // 1%

    const signature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        accountAddress,
        client,
    );

    const wethIsEth = false;

    const { call, to, minAmountsOut } = removeLiquidityNested.buildCall({
        ...queryOutput,
        slippage,
        accountAddress,
        relayerApprovalSignature: signature,
        wethIsEth,
    });

    let tokensOut = queryOutput.amountsOut.map((a) => a.token);
    if (wethIsEth) {
        tokensOut = replaceWrapped(tokensOut, chainId);
    }

    console.log('\nWith slippage applied:');
    console.table({
        tokensOut: minAmountsOut.map((a) => a.token.address),
        minAmountsOut: minAmountsOut.map((a) => a.amount),
    });

    const tokens = [
        ...tokensOut.map((t) => t.address),
        queryOutput.bptAmountIn.token.address,
    ];

    // send remove liquidity nested transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            tokens,
            client,
            accountAddress,
            to,
            call,
        );
    console.log(`\nTransaction status: ${transactionReceipt.status}`);
    console.log('Token balance deltas:');
    console.table({
        tokens,
        balanceDeltas,
    });
};

const exampleSetup = async (): Promise<{
    client: Client & PublicActions & TestActions & WalletActions;
    accountAddress: Address;
    nestedPoolState: NestedPoolState;
    rpcUrl: string;
}> => {
    const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);
    const balancerApi = new BalancerApi(balancerApiUrl, chainId);
    const nestedPoolState =
        await balancerApi.nestedPools.fetchNestedPoolState(poolId);

    const client: Client & PublicActions & TestActions & WalletActions =
        createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

    const accountAddress = (await client.getAddresses())[0];

    const rootPool = nestedPoolState.pools.sort((a, b) => b.level - a.level)[0];

    const testTokens = [
        {
            address: rootPool.address,
            balance: parseUnits('1000', 18),
            slot: 0,
        },
    ];

    await forkSetup(
        client,
        accountAddress,
        testTokens.map((t) => t.address),
        testTokens.map((t) => t.slot),
        testTokens.map((t) => t.balance),
    );

    return {
        client,
        accountAddress,
        nestedPoolState,
        rpcUrl,
    };
};

export default removeLiquidityNested;
