/**
 * Example showing how to add liquidity to a pool while approving tokens through Permit2 signature.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/addLiquidity/addLiquidityWithPermit2Signature.ts
 */
import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
} from 'viem';
import {
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidity,
    BalancerApi,
    ChainId,
    PriceImpact,
    Slippage,
    TEST_API_ENDPOINT,
    CHAINS,
    Permit2Helper,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { getSlot } from 'examples/lib/getSlot';
import { makeForkTx } from 'examples/lib/makeForkTx';

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
    const chainId = ChainId.SEPOLIA;
    // 50BAL-50WETH
    const pool = {
        id: '0x2ff3b96e0057a1f25f1d62ab800554ccdb268ab8',
        address: '0x2ff3b96e0057a1f25f1d62ab800554ccdb268ab8' as Address,
    };
    const amountsIn = [
        {
            rawAmount: parseEther('0.0001'),
            decimals: 18,
            address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9' as Address,
        },
        {
            rawAmount: parseEther('0.0001'),
            decimals: 18,
            address: '0xb19382073c7a0addbb56ac6af1808fa49e377b75' as Address,
        },
    ];
    const slippage = Slippage.fromPercentage('1'); // 1%

    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const userAccount = (await client.getAddresses())[0];

    // build add liquidity call with permit2 approvals
    const call = await addLiquidityWithPermit2Signature({
        client,
        userAccount,
        rpcUrl,
        chainId,
        amountsIn,
        poolId: pool.id,
        slippage,
    });

    // Skip Permit2 approval during fork setup so we can test approvals through signatures
    const approveOnPermit2 = false;

    // Make the tx against the local fork and print the result
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
            client,
        },
        [...amountsIn.map((a) => a.address), pool.address],
        call.protocolVersion,
        approveOnPermit2,
    );
}

const addLiquidityWithPermit2Signature = async ({
    client,
    userAccount,
    rpcUrl,
    chainId,
    poolId,
    amountsIn,
    slippage,
}) => {
    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(TEST_API_ENDPOINT, chainId);
    const poolState = await balancerApi.pools.fetchPoolState(poolId);

    // Construct the AddLiquidityInput, in this case an AddLiquidityUnbalanced
    const addLiquidityInput: AddLiquidityInput = {
        amountsIn,
        chainId,
        rpcUrl,
        kind: AddLiquidityKind.Unbalanced,
    };

    // Calculate price impact to ensure it's acceptable
    const priceImpact = await PriceImpact.addLiquidityUnbalanced(
        addLiquidityInput,
        poolState,
    );
    console.log(`\nPrice Impact: ${priceImpact.percentage.toFixed(2)}%`);

    // Simulate addLiquidity to get the amount of BPT out
    const addLiquidity = new AddLiquidity();
    const queryOutput = await addLiquidity.query(addLiquidityInput, poolState);

    console.log('\nAdd Liquidity Query Output:');
    console.log('Tokens In:');
    queryOutput.amountsIn.map((a) =>
        console.log(a.token.address, a.amount.toString()),
    );
    console.log(`BPT Out: ${queryOutput.bptOut.amount.toString()}`);

    // Add liquidity build call input with slippage applied to BPT amount from query output
    const addLiquidityBuildCallInput = {
        ...queryOutput,
        slippage,
        chainId,
        wethIsEth: false,
    };

    // Sign permit2 approvals
    const permit2 = await Permit2Helper.signAddLiquidityApproval({
        ...addLiquidityBuildCallInput,
        client,
        owner: userAccount,
    });

    // Build call with permit2 approvals
    const call = addLiquidity.buildCallWithPermit2(
        addLiquidityBuildCallInput,
        permit2,
    );

    console.log('\nWith slippage applied:');
    console.log('Max tokens in:');
    call.maxAmountsIn.forEach((a) =>
        console.log(a.token.address, a.amount.toString()),
    );
    console.log(`Min BPT Out: ${call.minBptOut.amount.toString()}`);

    return {
        ...call,
        protocolVersion: queryOutput.protocolVersion,
    };
};

export default runAgainstFork;
