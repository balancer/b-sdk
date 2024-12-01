/**
 * Example showing how to use Smart Order Router (SOR) to query and execute a swap
 *
 * Run with:
 * pnpm example ./examples/swaps/swapV2.ts
 */

import {
    ChainId,
    Slippage,
    SwapKind,
    Token,
    TokenAmount,
    SwapBuildCallInput,
    VAULT,
} from '../../src';
import { querySmartPath } from './querySmartPath';
import { setupExampleFork } from '../lib/setupExampleFork';
import { TOKENS, approveSpenderOnToken } from 'test/lib/utils';

const swapV2 = async () => {
    // Choose chain id to start fork
    const chainId = ChainId.MAINNET;
    const { client, rpcUrl, userAccount } = await setupExampleFork({ chainId });

    // User defines these params for querying swap with SOR
    const swapKind = SwapKind.GivenIn;
    const tokenIn = new Token(
        chainId,
        TOKENS[chainId].WETH.address,
        TOKENS[chainId].WETH.decimals,
        'WETH',
    );
    const tokenOut = new Token(
        chainId,
        TOKENS[chainId].BAL.address,
        TOKENS[chainId].BAL.decimals,
        'BAL',
    );
    const swapAmount =
        swapKind === SwapKind.GivenIn
            ? TokenAmount.fromHumanAmount(tokenIn, '1')
            : TokenAmount.fromHumanAmount(tokenOut, '1');

    const { swap, queryOutput } = await querySmartPath({
        rpcUrl,
        chainId,
        swapKind,
        tokenIn,
        tokenOut,
        swapAmount,
    });

    // User defines these params for sending transaction
    const sender = userAccount;
    const recipient = userAccount;
    const slippage = Slippage.fromPercentage('0.1');
    const deadline = 999999999999999999n; // Infinity
    const wethIsEth = false;

    const swapBuildCallInput: SwapBuildCallInput = {
        sender,
        recipient,
        slippage,
        deadline,
        wethIsEth,
        queryOutput,
    };

    // Approve V2 Vault contract as spender of tokenIn
    await approveSpenderOnToken(
        client,
        sender,
        tokenIn.address,
        VAULT[chainId],
    );

    // Build call to make swap transaction
    const swapCall = swap.buildCall(swapBuildCallInput);

    if ('minAmountOut' in swapCall && 'expectedAmountOut' in queryOutput) {
        console.log(
            `Min Amount Out: ${swapCall.minAmountOut.amount}\n\nTx Data:\nTo: ${swapCall.to}\nCallData: ${swapCall.callData}\nValue: ${swapCall.value}`,
        );
    } else if ('maxAmountIn' in swapCall && 'expectedAmountIn' in queryOutput) {
        console.log(
            `Max Amount In: ${swapCall.maxAmountIn.amount}\n\nTx Data:\nTo: ${swapCall.to}\nCallData: ${swapCall.callData}\nValue: ${swapCall.value}`,
        );
    }

    // Send swap transaction
    const hash = await client.sendTransaction({
        account: userAccount,
        data: swapCall.callData,
        to: swapCall.to,
        value: swapCall.value,
    });

    // TODO: parse txReceipt logs for relevent data to display
    const txReceipt = await client.getTransactionReceipt({ hash });
    console.log('txReceipt', txReceipt);
};

export default swapV2;
