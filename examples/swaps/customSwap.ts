/**
 * Example showing how to find swap information for a token pair using a particular pool.
 *
 * Using the optional account param for swap query to test pool with fee discount hook based on user's veBAL balance
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
    ExactInQueryOutput,
} from '@balancer/sdk';
import { Address, parseUnits, formatUnits } from 'viem';

const customSwap = async () => {
    // User defined
    const account = '0x5036388C540994Ed7b74b82F71175a441F85BdA1'; // User sending the swap
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const swapInput = {
        chainId: ChainId.SEPOLIA,
        swapKind: SwapKind.GivenIn,
        paths: [
            {
                pools: [
                    '0x6D9656174205876897A9f526CCDcD3aE725ffEFF' as Address,
                ],
                tokens: [
                    {
                        address:
                            '0xE8d4E9Fc8257B77Acb9eb80B5e8176F4f0cBCeBC' as Address,
                        decimals: 18,
                    }, // tokenIn
                    {
                        address:
                            '0xF0Bab79D87F51a249AFe316a580C1cDFC111bE10' as Address,
                        decimals: 18,
                    }, // tokenOut
                ],
                protocolVersion: 3 as const,
                inputAmountRaw: parseUnits('10', 18),
                outputAmountRaw: 990000000000000000n,
            },
        ],
    };

    // Swap object provides useful helpers for re-querying, building call, etc
    const swap = new Swap(swapInput);

    console.log(
        `Input token: ${swap.inputAmount.token.address}, Amount: ${swap.inputAmount.amount}`,
    );
    console.log(
        `Output token: ${swap.outputAmount.token.address}, Amount: ${swap.outputAmount.amount}`,
    );

    // // Get up to date swap result by querying onchain
    const updatedOutputAmount = (await swap.query(
        rpcUrl,
        undefined,
        account,
    )) as ExactInQueryOutput;
    console.log(
        `Updated amount: ${formatUnits(
            updatedOutputAmount.expectedAmountOut.amount,
            18,
        )}`,
    );

    // Build call data using user defined slippage
    const callData = swap.buildCall({
        slippage: Slippage.fromPercentage('0.1'), // 0.1%,
        deadline: 999999999999999999n, // Deadline for the swap, in this case infinite
        queryOutput: updatedOutputAmount,
        wethIsEth: false,
    }) as SwapBuildOutputExactIn;

    console.log(
        `Min Amount Out: ${callData.minAmountOut.amount}\n\nTx Data:\nTo: ${callData.to}\nCallData: ${callData.callData}\nValue: ${callData.value}`,
    );
};

export default customSwap;
