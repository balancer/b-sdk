/**
 * Example showing how to find swap information for a token pair
 *
 * Run with:
 * pnpm example ./examples/swaps/swap.ts
 */
import { config } from 'dotenv';
config();

import {
    BalancerApi,
    API_ENDPOINT,
    ChainId,
    Slippage,
    SwapKind,
    Token,
    TokenAmount,
    Swap,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    Permit2Batch,
    MaxAllowanceExpiration,
    BALANCER_ROUTER,
    PERMIT2,
    permit2Abi,
    PermitDetails,
    MaxSigDeadline,
    AllowanceTransfer,
} from '../../src';

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
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const chainId = ChainId.SEPOLIA;
    const swapKind = SwapKind.GivenIn;
    const tokenIn = new Token(
        chainId,
        '0xE8d4E9Fc8257B77Acb9eb80B5e8176F4f0cBCeBC',
        18,
        'MockToken1',
    );
    const tokenOut = new Token(
        chainId,
        '0xF0Bab79D87F51a249AFe316a580C1cDFC111bE10',
        18,
        'MockToken2',
    );
    const wethIsEth = false;
    const slippage = Slippage.fromPercentage('0.1');
    const swapAmount =
        swapKind === SwapKind.GivenIn
            ? TokenAmount.fromHumanAmount(tokenIn, '1.2345678910')
            : TokenAmount.fromHumanAmount(tokenOut, '1.2345678910');
    const sender = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const recipient = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const deadline = 999999999999999999n; // Infinity

    // API is used to fetch best path from available liquidity
    const balancerApi = new BalancerApi(API_ENDPOINT, chainId);

    const sorPaths = await balancerApi.sorSwapPaths.fetchSorSwapPaths({
        chainId,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        swapKind,
        swapAmount,
    });

    const swapInput = {
        chainId,
        paths: sorPaths,
        swapKind,
    };

    // Swap object provides useful helpers for re-querying, building call, etc
    const swap = new Swap(swapInput);

    console.log(
        `Input token: ${swap.inputAmount.token.address}, Amount: ${swap.inputAmount.amount}`,
    );
    console.log(
        `Output token: ${swap.outputAmount.token.address}, Amount: ${swap.outputAmount.amount}`,
    );

    // Get up to date swap result by querying onchain
    const queryOutput = await swap.query(rpcUrl);

    const buildCallInput = {
        slippage,
        deadline,
        queryOutput,
        sender,
        recipient,
        wethIsEth,
    };

    const [, , nonce] = await publicClient.readContract({
        address: PERMIT2[chainId],
        abi: permit2Abi,
        functionName: 'allowance',
        args: [account.address, tokenIn.address, BALANCER_ROUTER[chainId]],
    });

    const details: PermitDetails[] = [
        {
            token: tokenIn.address,
            amount: swapAmount.amount,
            expiration: Number(MaxAllowanceExpiration),
            nonce,
        },
    ];

    const batch: Permit2Batch = {
        details,
        spender: BALANCER_ROUTER[chainId],
        sigDeadline: MaxSigDeadline,
    };

    const { domain, types, values } = AllowanceTransfer.getPermitData(
        batch,
        PERMIT2[chainId],
        chainId,
    );

    const signature = await account.signTypedData({
        message: { ...values },
        domain,
        primaryType: 'PermitBatch',
        types,
    });

    // Construct transaction to make swap
    if (queryOutput.swapKind === SwapKind.GivenIn) {
        console.log(`Updated amount: ${queryOutput.expectedAmountOut.amount}`);
        const callData = swap.buildCallWithPermit2(buildCallInput, {
            signature,
            batch,
        }) as SwapBuildOutputExactIn;
        console.log(
            `Min Amount Out: ${callData.minAmountOut.amount}\n\nTx Data:\nTo: ${callData.to}\nCallData: ${callData.callData}\nValue: ${callData.value}`,
        );
    } else {
        console.log(`Updated amount: ${queryOutput.expectedAmountIn.amount}`);
        const callData = swap.buildCallWithPermit2(buildCallInput, {
            signature,
            batch,
        }) as SwapBuildOutputExactOut;
        console.log(
            `Max Amount In: ${callData.maxAmountIn.amount}\n\nTx Data:\nTo: ${callData.to}\nCallData: ${callData.callData}\nValue: ${callData.value}`,
        );
    }
};

export default swap;
