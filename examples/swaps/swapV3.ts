/**
 * Example showing how to query and execute a v3 swap using a custom path
 * Note that all v3 swaps require permit2 approvals
 *
 * Run with:
 * pnpm example ./examples/swaps/swapV3.ts
 */

import {
    Slippage,
    SwapKind,
    PERMIT2,
    TokenAmount,
    ChainId,
    Permit2Helper,
    SwapBuildCallInput,
    erc20Abi,
} from '../../src';
import { TOKENS, POOLS, approveSpenderOnToken } from 'test/lib/utils';
import { setupExampleFork } from '../lib/setupExampleFork';
import { queryCustomPath } from './queryCustomPath';
import { parseUnits, parseEventLogs } from 'viem';

const swapV3 = async () => {
    // Choose chain id to start fork
    const chainId = ChainId.SEPOLIA;
    const { client, rpcUrl, userAccount } = await setupExampleFork({ chainId });

    // Query swap results before sending transaction
    const { swap, queryOutput } = await queryCustomPath({
        rpcUrl,
        chainId,
        pools: [POOLS[chainId].MOCK_WETH_BAL_POOL.id],
        tokenIn: {
            address: TOKENS[chainId].WETH.address,
            decimals: TOKENS[chainId].WETH.decimals,
        },
        tokenOut: {
            address: TOKENS[chainId].BAL.address,
            decimals: TOKENS[chainId].BAL.decimals,
        },
        swapKind: SwapKind.GivenIn,
        protocolVersion: 3,
        inputAmountRaw: parseUnits('0.01', TOKENS[chainId].WETH.decimals),
        outputAmountRaw: parseUnits('1', TOKENS[chainId].BAL.decimals),
    });

    // Amount of tokenIn depends on swapKind
    let tokenIn: TokenAmount;
    if (queryOutput.swapKind === SwapKind.GivenIn) {
        tokenIn = queryOutput.amountIn;
    } else {
        tokenIn = queryOutput.expectedAmountIn;
    }

    // Approve Permit2 contract as spender of tokenIn
    await approveSpenderOnToken(
        client,
        userAccount,
        tokenIn.token.address,
        PERMIT2[chainId],
    );

    // User defines the following params for sending swap transaction
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

    // Use signature to permit2 approve transfer of tokens to Balancer's cannonical Router
    const signedPermit2Batch = await Permit2Helper.signSwapApproval({
        ...swapBuildCallInput,
        client,
        owner: sender,
    });

    // Build call with Permit2 signature
    const swapCall = swap.buildCallWithPermit2(
        swapBuildCallInput,
        signedPermit2Batch,
    );

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

    const txReceipt = await client.waitForTransactionReceipt({ hash });

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

export default swapV3;
