/**
 * Example showing how to remove liquidity from a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/removeLiquidity/removeLiquidity.ts
 */
import { Address, parseEther } from 'viem';
import {
    BalancerApi,
    API_ENDPOINT,
    ChainId,
    InputAmount,
    PoolState,
    PriceImpact,
    RemoveLiquidity,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    Slippage,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from '../lib/makeForkTx';

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
    const chainId = ChainId.MAINNET;
    const userAccount = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    // 80BAL-20WETH
    const pool = {
        id: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
        address: '0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56' as Address,
    };
    const bptIn: InputAmount = {
        rawAmount: parseEther('1'),
        decimals: 18,
        address: pool.address,
    };
    const tokenOut = '0xba100000625a3754423978a60c9317c58a424e3D'; // BAL
    const slippage = Slippage.fromPercentage('1'); // 1%

    const call = await removeLiquidity({
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
        },
        [
            '0xba100000625a3754423978a60c9317c58a424e3D' as Address,
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
            pool.address,
        ],
        call.protocolVersion,
    );
}

const removeLiquidity = async ({
    rpcUrl,
    chainId,
    userAccount,
    poolId,
    bptIn,
    tokenOut,
    slippage,
}) => {
    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(
        API_ENDPOINT,
        chainId,
    );
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

    // Apply slippage to the tokens out received from the query and construct the call
    const call = removeLiquidity.buildCall({
        ...queryOutput,
        slippage,
        sender: userAccount,
        recipient: userAccount,
        chainId,
    });

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

export default runAgainstFork;
