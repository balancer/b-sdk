/**
 * Example showing how to find swap information for a token pair using a pool that has a hook.
 *
 * Run with:
 * pnpm example ./examples/swaps/customSwap.ts
 */
import {
    ChainId,
    Slippage,
    SwapKind,
    Swap,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    ExactInQueryOutput,
    ExactOutQueryOutput,
} from '@balancer/sdk';
import { Address, parseUnits, zeroAddress } from 'viem';

const customSwap = async () => {
    // User defined
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const chainId = ChainId.SEPOLIA;
    const account = '0x5036388C540994Ed7b74b82F71175a441F85BdA1'; // User sending the swap - DOES NOT WORK
    // const account = zeroAddress; // WORKS
    const pools = ['0x6D9656174205876897A9f526CCDcD3aE725ffEFF' as Address];
    const tokenIn = {
        address: '0xE8d4E9Fc8257B77Acb9eb80B5e8176F4f0cBCeBC' as Address,
        decimals: 18,
    };
    const tokenOut = {
        address: '0xF0Bab79D87F51a249AFe316a580C1cDFC111bE10' as Address,
        decimals: 18,
    };
    const swapKind = SwapKind.GivenIn;
    const tokens = [tokenIn, tokenOut];
    const protocolVersion = 3 as const;
    const inputAmountRaw = parseUnits('7', 18);
    const outputAmountRaw = parseUnits('1', 18);
    const slippage = Slippage.fromPercentage('0.1'); // 0.1%,
    const deadline = 999999999999999999n; // Deadline for the swap, in this case infinite

    const paths = [
        { pools, tokens, protocolVersion, inputAmountRaw, outputAmountRaw },
    ];
    const swapInput = { chainId, swapKind, paths };

    // Swap object provides useful helpers for re-querying, building call, etc
    const swap = new Swap(swapInput);

    // Get up to date swap result by querying onchain
    const queryOutput = (await swap.query(
        rpcUrl,
        6645259n, // block number
        account, // required for accurate query if pool uses hook that depends on reading user's on chain state
    )) as ExactInQueryOutput | ExactOutQueryOutput;

    if (queryOutput.swapKind === SwapKind.GivenIn) {
        console.log(
            `User Input Amount: ${swap.inputAmount.amount} (token: ${swap.inputAmount.token.address})\nExpected Amount Out: ${queryOutput.expectedAmountOut.amount} (token: ${swap.outputAmount.token.address})`,
        );
    } else {
        console.log(
            `User Output Amount: ${swap.outputAmount.amount} ( token: ${swap.outputAmount.token.address} )\nExpected Amount In: ${queryOutput.expectedAmountIn.amount}`,
        );
    }

    // Build call data using user defined slippage
    const callData = swap.buildCall({
        slippage,
        deadline,
        queryOutput,
        wethIsEth: false,
    }) as SwapBuildOutputExactIn | SwapBuildOutputExactOut;

    if ('minAmountOut' in callData) {
        console.log(
            `Minimum Amount Out: ${callData.minAmountOut.amount}\n\nTx Data:\nTo: ${callData.to}\nCallData: ${callData.callData}\nValue: ${callData.value}`,
        );
    } else {
        console.log(
            `Maximum Amount In: ${callData.maxAmountIn.amount}\n\nTx Data:\nTo: ${callData.to}\nCallData: ${callData.callData}\nValue: ${callData.value}`,
        );
    }
};

export default customSwap;
