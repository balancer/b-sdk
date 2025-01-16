/**
 * Example showing how to add liquidity to a pool from a V2 nested pool.
 * User use signature to approve Balancer Relayer to use any existing V2 token approvals.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/addLiquidity/addLiquidityNested.V2.ts
 */
import {
    createTestClient,
    http,
    parseEther,
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
    AddLiquidityNested,
    AddLiquidityNestedInput,
} from '../../src';
import {
    ANVIL_NETWORKS,
    NetworkSetup,
    startFork,
} from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from 'examples/lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';

const addLiquidityNested = async () => {
    // User defined inputs
    const chainId = ChainId.MAINNET;
    // WETH-3POOL
    const pool = {
        id: '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0',
        address: '0x08775ccb6674d6bDCeB0797C364C2653ED84F384' as Address,
    };
    // DAI
    const amountsIn = [
        {
            rawAmount: parseEther('1'),
            decimals: 18,
            address: '0x6b175474e89094c44da98b954eedeac495271d0f' as Address,
        },
    ];
    const slippage = Slippage.fromPercentage('1'); // 1%
    const wethIsEth = false;

    // This sets up a local fork with a test client/account
    const { rpcUrl, client } = await setup(chainId, ANVIL_NETWORKS.MAINNET);
    const userAccount = (await client.getAddresses())[0];

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(API_ENDPOINT, chainId);
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

    // Calculate price impact to ensure it's acceptable
    const priceImpact = await PriceImpact.addLiquidityNested(
        addLiquidityInput,
        nestedPoolState,
    );
    console.log(`\nPrice Impact: ${priceImpact.percentage.toFixed(2)}%`);

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

    // Use signature to approve Balancer Relayer to use any existing V2 token approvals
    const relayerApprovalSignature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        userAccount,
        client,
    );

    const call = addLiquidityNested.buildCall(
        addLiquidityNested.buildAddLiquidityInput(queryOutput, {
            slippage,
            accountAddress: userAccount,
            relayerApprovalSignature,
            wethIsEth,
        }),
    );

    console.log('\nWith slippage applied:');
    console.log(`Min BPT Out: ${call.minBptOut.toString()}`);

    return {
        rpcUrl,
        chainId,
        txInfo: {
            to: call.to,
            callData: call.callData,
        },
        account: userAccount,
        bptOut: queryOutput.bptOut,
        amountsIn: queryOutput.amountsIn,
        protocolVersion: queryOutput.protocolVersion,
    };
};

async function runAgainstFork() {
    const {
        rpcUrl,
        chainId,
        txInfo,
        account,
        bptOut,
        amountsIn,
        protocolVersion,
    } = await addLiquidityNested();

    await makeForkTx(
        txInfo,
        {
            rpcUrl,
            chainId,
            impersonateAccount: account,
            forkTokens: amountsIn.map((a) => ({
                address: a.token.address,
                slot: getSlot(chainId, a.token.address),
                rawBalance: a.amount,
            })),
        },
        [...amountsIn.map((a) => a.token.address), bptOut.token.address],
        protocolVersion,
    );
}

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

export default runAgainstFork;
