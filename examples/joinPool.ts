/**
 * Example showing how to join a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/joinPool.ts
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

const join = async () => {
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
    const poolStateInput = await balancerApi.pools.fetchPoolState(poolId);

    // We create arbitrary amounts in but these would usually be set by user
    const amountsIn = poolStateInput.tokens.map((t) => ({
        rawAmount: parseUnits('1', t.decimals),
        decimals: t.decimals,
        address: t.address,
    }));

    // Construct the AddLiquidityInput, in this case an Unbalanced join
    const addLiquidityInput: AddLiquidityInput = {
        amountsIn,
        chainId,
        rpcUrl,
        kind: AddLiquidityKind.Unbalanced,
    };

    // Simulate the join to get the amount of BPT out
    const addLiquidity = new AddLiquidity();
    const queryResult = await addLiquidity.query(
        addLiquidityInput,
        poolStateInput,
    );

    console.log('\nJoin Query Result:');
    console.log('Tokens In:');
    queryResult.amountsIn.map((a) =>
        console.log(a.token.address, a.amount.toString()),
    );
    console.log(`BPT Out: ${queryResult.bptOut.amount.toString()}`);

    // Apply slippage to the BPT amount received from the query and construct the call
    const call = addLiquidity.buildCall({
        ...queryResult,
        slippage,
        sender: userAccount,
        recipient: userAccount,
    });

    console.log('\nWith slippage applied:');
    console.log(`Max tokens in: ${call.maxAmountsIn}`); // TODO these should be InputAmounts or TokenAmounts?
    console.log(`Min BPT Out: ${call.minBptOut.toString()}`); // TODO these should be InputAmounts or TokenAmounts?

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
        poolStateInput,
    );
};

join().then(() => {});
