/**
 * Example showing how to add liquidity to a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/addLiquidity/addLiquidityUnbalanced.ts
 */
import { Address, parseEther } from 'viem';
import {
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidity,
    BalancerApi,
    ChainId,
    PriceImpact,
    Slippage,
    TEST_API_ENDPOINT,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from '../lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
    const chainId = ChainId.SEPOLIA;
    const userAccount = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    // 50BAL-50WETH
    const pool = {
        id: '0x5e54dad6c2504d63473f95d8025b763fd5b893c6',
        address: '0x5e54dad6c2504d63473f95d8025b763fd5b893c6' as Address,
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

    const call = await addLiquidityExample({
        rpcUrl,
        chainId,
        amountsIn,
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
            forkTokens: amountsIn.map((a) => ({
                address: a.address,
                slot: getSlot(chainId, a.address),
                rawBalance: a.rawAmount,
            })),
        },
        [...amountsIn.map((a) => a.address), pool.address],
        call.protocolVersion,
    );
}

export const addLiquidityExample = async ({
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

    // Apply slippage to the BPT amount received from the query and construct the call
    const call = addLiquidity.buildCall({
        ...queryOutput,
        slippage,
        chainId,
        wethIsEth: false,
    });

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
