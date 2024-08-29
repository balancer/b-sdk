/**
 * Example showing how to add liquidity to a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/addLiquidity/addLiquidityProportional.ts
 */
import { Address } from 'viem';
import {
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidity,
    BalancerApi,
    ChainId,
    Slippage,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from '../lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(
        ANVIL_NETWORKS.MAINNET,
        undefined,
        20520774n,
    );
    const chainId = ChainId.MAINNET;
    const userAccount = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    // USDC-WETH CowAmm pool
    const pool = {
        id: '0xf08d4dea369c456d26a3168ff0024b904f2d8b91',
        address: '0xf08d4dea369c456d26a3168ff0024b904f2d8b91' as Address,
    };

    const referenceAmount = {
        rawAmount: 158708n,
        decimals: 6,
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Address, // USDC
    };

    const slippage = Slippage.fromPercentage('0'); // 1%

    const call = await addLiquidityProportional({
        rpcUrl,
        chainId,
        referenceAmount,
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
            forkTokens: call.maxAmountsIn.map((a) => ({
                address: a.token.address,
                slot: getSlot(chainId, a.token.address),
                rawBalance: a.amount,
            })),
        },
        [...call.maxAmountsIn.map((a) => a.token.address), pool.address],
        call.protocolVersion,
    );
}

const addLiquidityProportional = async ({
    rpcUrl,
    chainId,
    poolId,
    referenceAmount,
    slippage,
}) => {
    // API + on-chain calls are used to fetch relevant pool data
    const balancerApi = new BalancerApi('https://api-v3.balancer.fi/', chainId);
    const poolState = await balancerApi.pools.fetchPoolState(poolId);

    // Construct the AddLiquidityInput, in this case an AddLiquidityUnbalanced
    const addLiquidityInput: AddLiquidityInput = {
        referenceAmount,
        chainId,
        rpcUrl,
        kind: AddLiquidityKind.Proportional,
    };

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
