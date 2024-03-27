/**
 * Example showing how to add liquidity to a pool.
 * (Runs against a local Anvil fork)
 *
 * Run with:
 * pnpm example ./examples/addLiquidity/addLiquidity.ts
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
    const amountsIn = [
        {
            rawAmount: parseEther('1'),
            decimals: 18,
            address: '0xba100000625a3754423978a60c9317c58a424e3D' as Address,
        },
        {
            rawAmount: parseEther('1'),
            decimals: 18,
            address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address,
        },
    ];
    const slippage = Slippage.fromPercentage('1'); // 1%

    const call = await addLiquidity({
        rpcUrl,
        chainId,
        userAccount,
        amountsIn,
        poolId: pool.id,
        slippage,
    });

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
        [...amountsIn.map((a) => a.address), pool.address],
    );
}

const addLiquidity = async ({
    rpcUrl,
    chainId,
    userAccount,
    poolId,
    amountsIn,
    slippage,
}) => {
    // API is used to fetch relevant pool data
    const balancerApi = new BalancerApi(
        'https://backend-v3-canary.beets-ftm-node.com/graphql',
        chainId,
    );
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
        sender: userAccount,
        recipient: userAccount,
        chainId,
        wethIsEth: false,
    });

    console.log('\nWith slippage applied:');
    console.log('Max tokens in:');
    call.maxAmountsIn.forEach((a) =>
        console.log(a.token.address, a.amount.toString()),
    );
    console.log(`Min BPT Out: ${call.minBptOut.amount.toString()}`);

    return call;
};

export default runAgainstFork;
