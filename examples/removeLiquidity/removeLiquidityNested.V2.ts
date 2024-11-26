/**
 * Example showing how to remove liquidity from a V2 nested pool.
 * User use signature to approve Balancer Relayer to use any existing V2 token approvals.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/removeLiquidity/removeLiquidityNested.V2.ts
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
    API_ENDPOINT,
    ChainId,
    CHAINS,
    PriceImpact,
    Relayer,
    Slippage,
    RemoveLiquidityNested,
} from '../../src';
import {
    ANVIL_NETWORKS,
    NetworkSetup,
    startFork,
} from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from 'examples/lib/makeForkTx';

const removeLiquidityNested = async () => {
    // User defined inputs
    const chainId = ChainId.MAINNET;
    const pool = {
        id: '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0',
        address: '0x08775ccb6674d6bDCeB0797C364C2653ED84F384' as Address,
    }; // WETH-3POOL
    const bptAmountIn = parseUnits('1', 18);
    const tokenOut = '0x6b175474e89094c44da98b954eedeac495271d0f' as Address; // DAI
    const wethIsEth = false;
    const slippage = Slippage.fromPercentage('1'); // 1%

    // This sets up a local fork with a test client/account
    const { rpcUrl, client } = await setup(chainId, ANVIL_NETWORKS.MAINNET);
    const userAccount = (await client.getAddresses())[0];

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(API_ENDPOINT, chainId);
    const nestedPoolState = await balancerApi.nestedPools.fetchNestedPoolState(
        pool.id,
    );
    // setup remove liquidity helper
    const removeLiquidityNested = new RemoveLiquidityNested();

    const removeLiquidityInput = {
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

    // Query the current onchain result of the operation
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

    // Use signature to approve Balancer Relayer to use any existing V2 token approvals
    const relayerApprovalSignature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        userAccount,
        client,
    );

    // Build the transaction data with slippage applied
    const call = removeLiquidityNested.buildCall(
        removeLiquidityNested.buildRemoveLiquidityInput(queryOutput, {
            slippage,
            accountAddress: userAccount,
            relayerApprovalSignature,
            wethIsEth,
        }),
    );

    console.log('\nWith slippage applied:');
    console.table({
        tokensOut: call.minAmountsOut.map((a) => a.token.address),
        minAmountsOut: call.minAmountsOut.map((a) => a.amount),
    });
    return {
        rpcUrl,
        chainId,
        txInfo: {
            to: call.to,
            callData: call.callData,
        },
        account: userAccount,
        bptAmountIn: queryOutput.bptAmountIn,
        tokenOut,
        protocolVersion: queryOutput.protocolVersion,
    };
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

async function runAgainstFork() {
    const {
        rpcUrl,
        chainId,
        txInfo,
        account,
        bptAmountIn,
        tokenOut,
        protocolVersion,
    } = await removeLiquidityNested();

    await makeForkTx(
        txInfo,
        {
            rpcUrl,
            chainId,
            impersonateAccount: account,
            forkTokens: [
                {
                    address: bptAmountIn.token.address,
                    slot: 0,
                    rawBalance: bptAmountIn.amount,
                },
            ],
        },
        [tokenOut, bptAmountIn.token.address],
        protocolVersion,
    );
}

export default runAgainstFork;
