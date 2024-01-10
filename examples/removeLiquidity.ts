/**
 * Example showing how to remove liquidity from a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/removeLiquidity.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import {
    ChainId,
    RemoveLiquidityKind,
    RemoveLiquidity,
    PoolState,
    Slippage,
    InputAmount,
    RemoveLiquidityInput,
    BalancerApi,
} from '../src';
import { parseEther } from 'viem';
import { ANVIL_NETWORKS, startFork } from '../test/anvil/anvil-global-setup';
import { makeForkTx } from './utils/makeForkTx';

const removeLiquidity = async () => {
    // User defined:
    const chainId = ChainId.MAINNET;
    const userAccount = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const poolId =
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH
    const tokenOut = '0xba100000625a3754423978a60c9317c58a424e3D'; // BAL
    const slippage = Slippage.fromPercentage('1'); // 1%

    // Start a local anvil fork that will be used to query/tx against
    const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );
    const poolState: PoolState = await balancerApi.pools.fetchPoolState(poolId);

    // Construct the RemoveLiquidityInput, in this case a RemoveLiquiditySingleToken
    const bptIn: InputAmount = {
        rawAmount: parseEther('1'),
        decimals: 18,
        address: poolState.address,
    };
    const removeLiquidityInput: RemoveLiquidityInput = {
        chainId,
        rpcUrl,
        bptIn,
        tokenOut,
        kind: RemoveLiquidityKind.SingleToken,
    };

    // Simulate removing liquidity to get the tokens out
    const removeLiquidity = new RemoveLiquidity();
    const queryOutput = await removeLiquidity.query(
        removeLiquidityInput,
        poolState,
    );

    console.log('Remove Liquidity Query Output:');
    console.log(`BPT In: ${queryOutput.bptIn.amount.toString()}\nTokens Out:`);
    queryOutput.amountsOut.map((a) =>
        console.log(a.token.address, a.amount.toString()),
    );

    // Apply slippage to the tokens out received from the query and construct the call
    const call = removeLiquidity.buildCall({
        ...queryOutput,
        slippage,
        sender: userAccount,
        recipient: userAccount,
        chainId
    });

    console.log('\nWith slippage applied:');
    console.log(`Max BPT In: ${call.maxBptIn.amount}`);
    console.log('Min amounts out: ');
    call.minAmountsOut.forEach((a) =>
        console.log(a.token.address, a.amount.toString()),
    );

    // Make the tx against the local fork and print the result
    await makeForkTx(
        call,
        {
            rpcUrl,
            chainId,
            impersonateAccount: userAccount,
            forkTokens: [
                {
                    address: bptIn.address,
                    slot: 0,
                    rawBalance: bptIn.rawAmount,
                },
            ],
        },
        poolState,
    );
};

export default removeLiquidity;
