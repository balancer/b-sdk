/**
 * Example showing how to remove liquidity from a pool in recovery mode.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/removeLiquidity/removeLiquidityRecovery.ts
 */
import { Address, parseEther } from 'viem';
import {
    BalancerApi,
    API_ENDPOINT,
    ChainId,
    InputAmount,
    PoolState,
    RemoveLiquidity,
    RemoveLiquidityKind,
    RemoveLiquidityRecoveryInput,
    Slippage,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from '../lib/makeForkTx';

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
    const chainId = ChainId.MAINNET;
    const userAccount = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    // vETH/WETH
    const pool = {
        id: '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76000000000000000000000570',
        address: '0x156C02f3f7fEf64a3A9D80CCF7085f23ccE91D76' as Address,
    };
    const bptIn: InputAmount = {
        rawAmount: parseEther('1'),
        decimals: 18,
        address: pool.address,
    };
    const slippage = Slippage.fromPercentage('1'); // 1%

    const call = await removeLiquidity({
        rpcUrl,
        chainId,
        userAccount,
        bptIn,
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
            '0x4Bc3263Eb5bb2Ef7Ad9aB6FB68be80E43b43801F' as Address,
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
    slippage,
}) => {
    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(API_ENDPOINT, chainId);
    const poolState: PoolState = await balancerApi.pools.fetchPoolState(poolId);

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
