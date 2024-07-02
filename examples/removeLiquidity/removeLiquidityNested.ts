/**
 * Example showing how to remove liquidity to a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/removeLiquidity/removeLiquidityNested.ts
 */
import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';
import {
    Address,
    BALANCER_RELAYER,
    BalancerApi,
    ChainId,
    CHAINS,
    PriceImpact,
    Relayer,
    replaceWrapped,
    Slippage,
    RemoveLiquidityNested,
    RemoveLiquidityNestedSingleTokenInput,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from 'examples/lib/makeForkTx';

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
    const chainId = ChainId.MAINNET;
    // WETH-3POOL
    const pool = {
        id: '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0',
        address: '0x08775ccb6674d6bDCeB0797C364C2653ED84F384' as Address,
    };
    const bptAmountIn = parseUnits('1', 18);
    const tokenOut = '0x6b175474e89094c44da98b954eedeac495271d0f' as Address; // DAI
    const slippage = Slippage.fromPercentage('1'); // 1%
    // This example requires the account to sign relayer approval
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);
    const userAccount = (await client.getAddresses())[0];
    const relayerApprovalSignature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        userAccount,
        client,
    );

    const call = await removeLiquidityNested({
        rpcUrl,
        chainId,
        userAccount,
        relayerApprovalSignature,
        bptAmountIn,
        tokenOut,
        poolId: pool.id,
        slippage,
    });

    await makeForkTx(
        call,
        {
            rpcUrl,
            chainId,
            impersonateAccount: userAccount,
            forkTokens: [
                {
                    address: pool.address,
                    slot: 0,
                    rawBalance: bptAmountIn,
                },
            ],
        },
        [tokenOut, pool.address],
        2, // todo - currently only supports V2
    );
}

const removeLiquidityNested = async ({
    rpcUrl,
    userAccount,
    bptAmountIn,
    tokenOut,
    relayerApprovalSignature,
    chainId,
    poolId,
    slippage,
}) => {
    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );
    const nestedPoolState =
        await balancerApi.nestedPools.fetchNestedPoolState(poolId);
    // setup remove liquidity helper
    const removeLiquidityNested = new RemoveLiquidityNested();

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

    const wethIsEth = false;

    const call = removeLiquidityNested.buildCall({
        ...queryOutput,
        slippage,
        accountAddress: userAccount,
        relayerApprovalSignature,
        wethIsEth,
    });

    let tokensOut = queryOutput.amountsOut.map((a) => a.token);
    if (wethIsEth) {
        tokensOut = replaceWrapped(tokensOut, chainId);
    }

    console.log('\nWith slippage applied:');
    console.table({
        tokensOut: call.minAmountsOut.map((a) => a.token.address),
        minAmountsOut: call.minAmountsOut.map((a) => a.amount),
    });
    return {
        ...call,
        protocolVersion: 2,
    };
};

export default runAgainstFork;
