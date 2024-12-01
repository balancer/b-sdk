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
} from '../../src';
import { TOKENS, approveSpenderOnToken } from 'test/lib/utils';
import { setupExampleFork } from '../lib/setupExampleFork';
import { queryCustomPath } from './queryCustomPath';
import { parseUnits, Address } from 'viem';

const swapV3 = async () => {
    // Choose chain id to start fork
    const chainId = ChainId.SEPOLIA;
    const { client, rpcUrl, userAccount } = await setupExampleFork({ chainId });

    // TODO: Fix query revert, see tenderly simulation: https://www.tdly.co/shared/simulation/f0b0a1de-4e88-4b8d-bf90-c25c4d2145ec
    // Query swap results before sending transaction
    const { swap, queryOutput } = await queryCustomPath({
        rpcUrl,
        chainId,
        pools: ['0xA8c18CE5E987d7D82ccAccB93223e9bb5Df4A3c0'] as Address[], // https://test.balancer.fi/pools/sepolia/v3/0xa8c18ce5e987d7d82ccaccb93223e9bb5df4a3c0
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
        inputAmountRaw: parseUnits('1', TOKENS[chainId].WETH.decimals),
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
        console.log(`Updated amount: ${queryOutput.expectedAmountOut.amount}`);
        console.log(
            `Min Amount Out: ${swapCall.minAmountOut.amount}\n\nTx Data:\nTo: ${swapCall.to}\nCallData: ${swapCall.callData}\nValue: ${swapCall.value}`,
        );
    } else if ('maxAmountIn' in swapCall && 'expectedAmountIn' in queryOutput) {
        console.log(`Updated amount: ${queryOutput.expectedAmountIn.amount}`);
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

    // TODO parse tx receipt logs to display results
    const txReceipt = await client.waitForTransactionReceipt({ hash });
    console.log('txReceipt', txReceipt);
};

export default swapV3;
