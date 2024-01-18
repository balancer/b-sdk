/**
 * Example showing how to add liquidity to a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/addLiquidity.ts
 */
import { config } from 'dotenv';
config();

import {
    BalancerApi,
    ChainId,
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidity,
    Slippage,
} from '../src';
import { parseUnits } from 'viem';
import { ANVIL_NETWORKS, startFork } from '../test/anvil/anvil-global-setup';
import { makeForkTx } from './utils/makeForkTx';

const addLiquidity = async () => {
    // User defined
    const chainId = ChainId.MAINNET;
    const userAccount = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const poolId =
        '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH
    const slippage = Slippage.fromPercentage('1'); // 1%

    // Start a local anvil fork that will be used to query/tx against
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);

    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );
    const poolState = await balancerApi.pools.fetchPoolState(poolId);

    // We create arbitrary amounts in but these would usually be set by user
    const amountsIn = poolState.tokens.map((t) => ({
        rawAmount: parseUnits('1', t.decimals),
        decimals: t.decimals,
        address: t.address,
    }));

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

    console.log('Add Liquidity Query Output:');
    console.log('Tokens In:');
    queryOutput.amountsIn.map((a) =>
        console.log(a.token.address, a.amount.toString()),
    );
    console.log(`BPT Out: ${queryOutput.bptOut.amount.toString()}`);

    // Apply slippage to the BPT amount received from the query and construct the call
    const call = addLiquidity.buildCall({
        ...queryOutput,
        slippage,
        sender: userAccount,
        recipient: userAccount,
        chainId,
    });

    console.log('\nWith slippage applied:');
    console.log('Max tokens in:');
    call.maxAmountsIn.forEach((a) =>
        console.log(a.token.address, a.amount.toString()),
    );
    console.log(`Min BPT Out: ${call.minBptOut.amount.toString()}`);

    // Make the tx against the local fork and print the result
    const slots = [1, 3, 0];
    await makeForkTx(
        call,
        {
            rpcUrl,
            chainId,
            impersonateAccount: userAccount,
            forkTokens: amountsIn.map((a, i) => ({
                address: a.address,
                slot: slots[i],
                rawBalance: a.rawAmount,
            })),
        },
        poolState,
    );
};

export default addLiquidity;
