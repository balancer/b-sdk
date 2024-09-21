/**
 * Example showing how to find swap information for a token pair
 *
 * Run with:
 * pnpm example ./examples/swaps/swapV3.ts
 */
import { config } from 'dotenv';
config();

import {
    ChainId,
    Slippage,
    SwapKind,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    MaxAllowanceExpiration,
    BALANCER_ROUTER,
    PERMIT2,
    permit2Abi,
    PermitDetails,
    TokenAmount,
} from '../../src';

import queryCustomPath from './queryCustomPath';
import { signPermit2 } from '../approvals';

import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const swap = async () => {
    // User defined
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(),
    });
    const account = privateKeyToAccount(
        process.env.PRIVATE_KEY as `0x${string}`,
    );
    const chainId = ChainId.SEPOLIA;
    // Get up to date swap result by querying onchain
    const { swap, queryOutput } = await queryCustomPath();

    const sender = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const recipient = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const slippage = Slippage.fromPercentage('0.1');
    const deadline = 999999999999999999n; // Infinity
    const wethIsEth = false;

    const buildCallInput = {
        sender,
        recipient,
        slippage,
        deadline,
        wethIsEth,
        queryOutput,
    };

    let tokenIn: TokenAmount;

    if (queryOutput.swapKind === SwapKind.GivenIn) {
        tokenIn = queryOutput.amountIn;
    } else {
        tokenIn = queryOutput.expectedAmountIn;
    }

    const [, , nonce] = await publicClient.readContract({
        address: PERMIT2[chainId],
        abi: permit2Abi,
        functionName: 'allowance',
        args: [
            account.address,
            tokenIn.token.address,
            BALANCER_ROUTER[chainId],
        ],
    });

    const details: PermitDetails[] = [
        {
            token: tokenIn.token.address,
            amount: tokenIn.amount,
            expiration: Number(MaxAllowanceExpiration),
            nonce,
        },
    ];

    const signedPermit2Batch = await signPermit2(account, details);

    const callData = swap.buildCallWithPermit2(
        buildCallInput,
        signedPermit2Batch,
    ) as SwapBuildOutputExactOut | SwapBuildOutputExactIn;

    // Construct transaction to make swap
    if ('minAmountOut' in callData && 'expectedAmountOut' in queryOutput) {
        console.log(`Updated amount: ${queryOutput.expectedAmountOut.amount}`);
        console.log(
            `Min Amount Out: ${callData.minAmountOut.amount}\n\nTx Data:\nTo: ${callData.to}\nCallData: ${callData.callData}\nValue: ${callData.value}`,
        );
    } else if ('maxAmountIn' in callData && 'expectedAmountIn' in queryOutput) {
        console.log(`Updated amount: ${queryOutput.expectedAmountIn.amount}`);
        console.log(
            `Max Amount In: ${callData.maxAmountIn.amount}\n\nTx Data:\nTo: ${callData.to}\nCallData: ${callData.callData}\nValue: ${callData.value}`,
        );
    }
};

export default swap;
