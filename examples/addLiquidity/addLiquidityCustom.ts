/**
 * Example showing how to add liquidity to a pool from a custom pool factory that is not currently supported in Balancer API.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/addLiquidity/addLiquidityCustom.ts
 */
import { Address, parseEther } from 'viem';
import {
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidity,
    ChainId,
    Slippage,
    OnChainProvider,
} from '../../src';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';
import { makeForkTx } from '../lib/makeForkTx';
import { getSlot } from 'examples/lib/getSlot';

async function runAgainstFork() {
    // User defined inputs
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
    const chainId = ChainId.SEPOLIA;
    const userAccount = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    // Pool from a custom factory that is not currently supported in Balancer API
    const pool = {
        id: '0xd851b2b78c41c40a4fa134f6fc4282b71f0f1491',
        address: '0xd851b2b78c41c40a4fa134f6fc4282b71f0f1491' as Address,
    };
    const amountsIn = [
        {
            rawAmount: parseEther('0.01'),
            decimals: 18,
            address: '0x990c8eab51d9ecb365bf9b3de09d121af007db68' as Address,
        },
        {
            rawAmount: parseEther('0.01'),
            decimals: 18,
            address: '0xcd20075dc190c411287132e891ec42f009babc73' as Address,
        },
    ];
    const slippage = Slippage.fromPercentage('1'); // 1%

    const call = await addLiquidity({
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
        call.vaultVersion,
    );
}

const addLiquidity = async ({
    rpcUrl,
    chainId,
    poolId,
    amountsIn,
    slippage,
}) => {
    // Onchain provider is used to fetch pool state
    const onchainProvider = new OnChainProvider(rpcUrl, chainId);
    const poolState = await onchainProvider.pools.fetchPoolState(
        poolId,
        'CustomPool',
    );

    // Construct the AddLiquidityInput, in this case an AddLiquidityUnbalanced
    const addLiquidityInput: AddLiquidityInput = {
        amountsIn,
        chainId,
        rpcUrl,
        kind: AddLiquidityKind.Unbalanced,
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
        vaultVersion: queryOutput.vaultVersion,
    };
};

export default runAgainstFork;
