/**
 * Example showing how to use Smart Order Router (SOR) to query and execute a swap
 *
 * Run with:
 * pnpm example ./examples/swaps/swapV2.ts
 */

import { erc20Abi, parseEventLogs } from 'viem';
import {
    ChainId,
    Slippage,
    SwapKind,
    SwapBuildCallInput,
    VAULT_V2,
} from '../../src';
import { BaseToken } from '@/entities/baseToken';
import { querySmartPath } from './querySmartPath';
import { setupExampleFork } from '../lib/setupExampleFork';
import { TOKENS, approveSpenderOnToken } from 'test/lib/utils';
import { TokenAmount } from '@/entities';

const swapV2 = async () => {
    // Choose chain id to start fork
    const chainId = ChainId.MAINNET;
    const { client, rpcUrl, userAccount } = await setupExampleFork({ chainId });

    // User defines these params for querying swap with SOR
    const swapKind = SwapKind.GivenIn;
    const tokenIn = new BaseToken(
        chainId,
        TOKENS[chainId].WETH.address,
        TOKENS[chainId].WETH.decimals,
        'WETH',
    );
    const tokenOut = new BaseToken(
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
        VAULT_V2[chainId],
    );

    // Build call to make swap transaction
    const swapCall = swap.buildCall(swapBuildCallInput);

    if ('minAmountOut' in swapCall && 'expectedAmountOut' in queryOutput) {
        console.table([
            {
                Type: 'Query Token Out',
                Address: queryOutput.expectedAmountOut.token.address,
                Expected: queryOutput.expectedAmountOut.amount,
                Minimum: swapCall.minAmountOut.amount,
            },
        ]);
    } else if ('maxAmountIn' in swapCall && 'expectedAmountIn' in queryOutput) {
        console.table([
            {
                Type: 'Query Token In',
                Address: queryOutput.expectedAmountIn.token.address,
                Expected: queryOutput.expectedAmountIn.amount,
                Maximum: swapCall.maxAmountIn.amount,
            },
        ]);
    }

    console.log('Sending swap transaction...');
    const hash = await client.sendTransaction({
        account: userAccount,
        data: swapCall.callData,
        to: swapCall.to,
        value: swapCall.value,
    });

    const txReceipt = await client.getTransactionReceipt({ hash });

    const logs = parseEventLogs({
        abi: erc20Abi,
        eventName: 'Transfer',
        logs: txReceipt.logs,
    });

    console.log('Swap Results:');
    console.table(
        logs.map((log, index) => ({
            Type: index === 0 ? 'Token In' : 'Token Out',
            Address: log.address,
            Amount: log.args.value,
        })),
    );
};

export default swapV2;
