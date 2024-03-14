/**
 * Example showing how to remove liquidity from a pool in recovery mode.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/removeLiquidityRecovery.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { parseEther } from 'viem';

import {
    BalancerApi,
    ChainId,
    InputAmount,
    PoolStateWithBalances,
    RemoveLiquidity,
    RemoveLiquidityKind,
    RemoveLiquidityRecoveryInput,
    Slippage,
} from '../src';
import { ANVIL_NETWORKS, startFork } from '../test/anvil/anvil-global-setup';
import { makeForkTx } from './utils/makeForkTx';

const removeLiquidity = async () => {
    // User defined:
    const chainId = ChainId.MAINNET;
    const userAccount = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const poolId =
        '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76000000000000000000000570'; // vETH/WETH
    const slippage = Slippage.fromPercentage('1'); // 1%

    // Start a local anvil fork that will be used to query/tx against
    const { rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]);

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );
    const poolStateWithBalances: PoolStateWithBalances =
        await balancerApi.pools.fetchPoolStateWithBalances(poolId);

    // Construct the RemoveLiquidityInput, in this case a RemoveLiquiditySingleTokenExactIn
    const bptIn: InputAmount = {
        rawAmount: parseEther('1'),
        decimals: 18,
        address: poolStateWithBalances.address,
    };
    const removeLiquidityRecoveryInput: RemoveLiquidityRecoveryInput = {
        chainId,
        rpcUrl,
        bptIn,
        kind: RemoveLiquidityKind.Recovery,
    };

    // No need to calculate Price Impact as it's always zero for remove liquidity recovery

    // Simulate removing liquidity to get the tokens out
    const removeLiquidity = new RemoveLiquidity();
    const queryOutput = await removeLiquidity.queryRemoveLiquidityRecovery(
        removeLiquidityRecoveryInput,
        poolStateWithBalances,
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
        poolStateWithBalances,
    );
};

export default removeLiquidity;
