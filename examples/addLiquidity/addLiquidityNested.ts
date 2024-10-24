/**
 * Example showing how to add liquidity to a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/addLiquidity/addLiquidityNested.ts
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
    replaceWrapped,
    Slippage,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from 'examples/lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';
import { AddLiquidityNestedInput } from '@/entities/addLiquidityNested/addLiquidityNestedV2/types';
import { AddLiquidityNested } from '@/entities/addLiquidityNested';

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
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

    const call = await addLiquidityNested({
        rpcUrl,
        chainId,
        userAccount,
        relayerApprovalSignature,
        amountsIn,
        poolId: pool.id,
        slippage,
    });

    await makeForkTx(
        call,
        {
            rpcUrl,
            chainId,
            impersonateAccount: userAccount,
            forkTokens: amountsIn.map((a) => ({
                address: a.address,
                slot: getSlot(chainId, a.address),
                rawBalance: a.rawAmount,
            })),
        },
        [...amountsIn.map((a) => a.address), pool.address],
        2, // TODO - Currently only V2 support, update when SC ready
    );
}

const addLiquidityNested = async ({
    rpcUrl,
    userAccount,
    relayerApprovalSignature,
    chainId,
    poolId,
    amountsIn,
    slippage,
}) => {
    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(API_ENDPOINT, chainId);
    const nestedPoolState =
        await balancerApi.nestedPools.fetchNestedPoolState(poolId);

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
    const wethIsEth = false;

    const call = addLiquidityNested.buildCall({
        ...queryOutput,
        slippage,
        accountAddress: userAccount,
        relayerApprovalSignature,
        wethIsEth,
    });

    let tokensIn = queryOutput.amountsIn.map((a) => a.token);
    if (wethIsEth) {
        tokensIn = replaceWrapped(tokensIn, chainId);
    }

    console.log('\nWith slippage applied:');
    console.log(`Min BPT Out: ${call.minBptOut.toString()}`);
    return call;
};

export default runAgainstFork;
