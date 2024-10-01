/**
 * Example showing how to find swap information for a token pair
 *
 * Run with:
 * pnpm example ./examples/swaps/swapV3.ts
 */
import { config } from 'dotenv';
config();

import {
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
    CHAINS,
} from '../../src';

import queryCustomPath from './queryCustomPath';
import { approveSpenderOnToken, signPermit2 } from '../approvals';

import { createTestClient, http, publicActions, walletActions } from 'viem';
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';

const swapV3 = async () => {
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
    // User defined;
    const sender = '0x5036388C540994Ed7b74b82F71175a441F85BdA1';
    const recipient = '0x5036388C540994Ed7b74b82F71175a441F85BdA1';
    const slippage = Slippage.fromPercentage('0.1');
    const deadline = 999999999999999999n; // Infinity
    const wethIsEth = false;

    // Get up to date swap result by querying onchain
    const { chainId, swap, queryOutput } = await queryCustomPath();

    let tokenIn: TokenAmount;

    if (queryOutput.swapKind === SwapKind.GivenIn) {
        tokenIn = queryOutput.amountIn;
    } else {
        tokenIn = queryOutput.expectedAmountIn;
    }

    const client = createTestClient({
        // account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
        chain: CHAINS[chainId],
        mode: 'anvil',
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    // Impersonate sender so we don't need private key
    await client.impersonateAccount({ address: sender });

    // Approve Permit2 contract as spender of tokenIn
    await approveSpenderOnToken(
        client,
        sender,
        tokenIn.token.address,
        PERMIT2[chainId],
    );

    // Get Permit2 nonce for PermitDetails
    const [, , nonce] = await client.readContract({
        address: PERMIT2[chainId],
        abi: permit2Abi,
        functionName: 'allowance',
        args: [sender, tokenIn.token.address, BALANCER_ROUTER[chainId]],
    });

    // Set up details for Permit2 signature
    const details: PermitDetails[] = [
        {
            token: tokenIn.token.address,
            amount: tokenIn.amount,
            expiration: Number(MaxAllowanceExpiration),
            nonce,
        },
    ];

    // Sign Permit2 batch
    const signedPermit2Batch = await signPermit2(
        client,
        sender,
        chainId,
        details,
    );

    const buildCallInput = {
        sender,
        recipient,
        slippage,
        deadline,
        wethIsEth,
        queryOutput,
    };

    // Build call data with Permit2 signature
    const callData = swap.buildCallWithPermit2(
        buildCallInput,
        signedPermit2Batch,
    ) as SwapBuildOutputExactOut | SwapBuildOutputExactIn;

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

export default swapV3;
