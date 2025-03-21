/**
 * Example showing how to remove liquidity from a pool while approving tokens through Permit signature..
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/removeLiquidity/removeLiquidityWithPermitSignature.ts
 */
import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';
import {
    BalancerApi,
    ChainId,
    CHAINS,
    InputAmount,
    PermitHelper,
    PoolState,
    PriceImpact,
    PublicWalletClient,
    RemoveLiquidity,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityV3BuildCallInput,
    Slippage,
    TEST_API_ENDPOINT,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from '../lib/makeForkTx';
import { addLiquidityExample } from 'examples/addLiquidity/addLiquidityUnbalanced';
import { getSlot } from 'examples/lib/getSlot';

async function runAgainstFork() {
    // User defined inputs
    const chainId = ChainId.SEPOLIA;
    const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const userAccount = (await client.getAddresses())[0];

    // 50BAL-50WETH
    const pool = {
        id: '0x2ff3b96e0057a1f25f1d62ab800554ccdb268ab8',
        address: '0x2ff3b96e0057a1f25f1d62ab800554ccdb268ab8' as Address,
    };

    const slippage = Slippage.fromPercentage('1'); // 1%

    // prepare example by adding liquidity to the pool, so we can remove it
    await prepExample(rpcUrl, chainId, pool, slippage, userAccount, client);
    // TODO: suppress prepExample logs to avoid poluting the console with unnecessary content

    const bptIn: InputAmount = {
        rawAmount: parseEther('0.0001'),
        decimals: 18,
        address: pool.address,
    };
    const tokenOut = '0xb19382073c7a0addbb56ac6af1808fa49e377b75'; // BAL

    const call = await removeLiquidityWithPermitSignature({
        client,
        rpcUrl,
        chainId,
        userAccount,
        bptIn,
        tokenOut,
        poolId: pool.id,
        slippage,
    });

    // Make the tx against the local fork and print the result
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
                    rawBalance: parseEther('1'),
                },
            ],
            client,
        },
        [
            '0x7b79995e5f793a07bc00c21412e50ecae098e7f9' as Address,
            '0xb19382073c7a0addbb56ac6af1808fa49e377b75' as Address,
            pool.address,
        ],
        call.protocolVersion,
    );
}

const removeLiquidityWithPermitSignature = async ({
    client,
    rpcUrl,
    chainId,
    userAccount,
    poolId,
    bptIn,
    tokenOut,
    slippage,
}) => {
    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(TEST_API_ENDPOINT, chainId);
    const poolState: PoolState = await balancerApi.pools.fetchPoolState(poolId);

    // Construct the RemoveLiquidityInput, in this case a RemoveLiquiditySingleTokenExactIn
    const removeLiquidityInput: RemoveLiquidityInput = {
        chainId,
        rpcUrl,
        bptIn,
        tokenOut,
        kind: RemoveLiquidityKind.SingleTokenExactIn,
    };

    // Calculate price impact to ensure it's acceptable
    const priceImpact = await PriceImpact.removeLiquidity(
        removeLiquidityInput,
        poolState,
    );
    console.log(`\nPrice Impact: ${priceImpact.percentage.toFixed(2)}%`);

    // Simulate removing liquidity to get the tokens out
    const removeLiquidity = new RemoveLiquidity();
    const queryOutput = await removeLiquidity.query(
        removeLiquidityInput,
        poolState,
    );

    console.log('\nRemove Liquidity Query Output:');
    console.log(`BPT In: ${queryOutput.bptIn.amount.toString()}`);
    console.table({
        tokensOut: queryOutput.amountsOut.map((a) => a.token.address),
        amountsOut: queryOutput.amountsOut.map((a) => a.amount),
    });

    // Remove liquidity build call input with slippage applied to amountOut from query output
    const removeLiquidityBuildCallInput: RemoveLiquidityV3BuildCallInput = {
        ...queryOutput,
        slippage,
        chainId,
        userData: '0x',
    };

    // Sign permit approvals
    const permit = await PermitHelper.signRemoveLiquidityApproval({
        ...removeLiquidityBuildCallInput,
        client,
        owner: userAccount,
    });

    // build call with permit approvals
    const call = removeLiquidity.buildCallWithPermit(
        removeLiquidityBuildCallInput,
        permit,
    );

    console.log('\nWith slippage applied:');
    console.log(`Max BPT In: ${call.maxBptIn.amount}`);
    console.table({
        tokensOut: call.minAmountsOut.map((a) => a.token.address),
        minAmountsOut: call.minAmountsOut.map((a) => a.amount),
    });

    return {
        ...call,
        protocolVersion: queryOutput.protocolVersion,
    };
};

const prepExample = async (
    rpcUrl: string,
    chainId: ChainId,
    pool: { id: string; address: Address },
    slippage: Slippage,
    userAccount: Address,
    client: PublicWalletClient & TestActions,
) => {
    const amountsIn = [
        {
            rawAmount: parseEther('0.01'),
            decimals: 18,
            address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9' as Address,
        },
        {
            rawAmount: parseEther('0.01'),
            decimals: 18,
            address: '0xb19382073c7a0addbb56ac6af1808fa49e377b75' as Address,
        },
    ];

    const addLiquidityCall = await addLiquidityExample({
        rpcUrl,
        chainId,
        amountsIn,
        poolId: pool.id,
        slippage,
    });

    // Make the tx against the local fork and print the result
    await makeForkTx(
        addLiquidityCall,
        {
            rpcUrl,
            chainId,
            impersonateAccount: userAccount,
            forkTokens: amountsIn.map((a) => ({
                address: a.address,
                slot: getSlot(chainId, a.address),
                rawBalance: a.rawAmount,
            })),
            client,
        },
        [...amountsIn.map((a) => a.address), pool.address],
        addLiquidityCall.protocolVersion,
    );
};

export default runAgainstFork;
