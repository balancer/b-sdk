// use custom path to query and return the queryOutput
/**
 * Example showing how to query swap using paths from the SOR
 *
 * Run with:
 * pnpm example ./examples/swaps/queryCustomPath.ts
 */
import { config } from 'dotenv';
config();

import {
    ChainId,
    SwapKind,
    Swap,
    ExactInQueryOutput,
    ExactOutQueryOutput,
} from '../../src';

import { Address, parseUnits } from 'viem';

const queryCustomPath = async () => {
    // User defined
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const chainId = ChainId.SEPOLIA;
    const pool = '0xb27aC1DD8192163CFbD6F977C91D31A07E941B87' as Address; // Constant Product Pool from scaffold balancer v3
    const tokenIn = {
        address: '0x83f953D2461C6352120E06f5f8EcCD3e4d66d042' as Address, // MockToken1 from scaffold balancer v3
        decimals: 18,
    };
    const tokenOut = {
        address: '0x9d57eDCe10b7BdDA98997613c33ff7f3e34F4eAd' as Address,
        decimals: 18,
    };
    const swapKind = SwapKind.GivenIn as SwapKind;
    const tokens = [tokenIn, tokenOut];
    const protocolVersion = 3 as const;
    const inputAmountRaw = parseUnits('1', 18);
    const outputAmountRaw = parseUnits('1', 18);

    const customPaths = [
        {
            pools: [pool],
            tokens,
            protocolVersion,
            inputAmountRaw,
            outputAmountRaw,
        },
    ];
    const swapInput = { chainId, swapKind, paths: customPaths };

    // Swap object provides useful helpers for re-querying, building call, etc
    const swap = new Swap(swapInput);

    if (swapKind === SwapKind.GivenIn) {
        console.log('Given tokenIn:', {
            address: tokenIn.address,
            amount: inputAmountRaw,
        });
    } else {
        console.log('Given tokenOut:', {
            address: tokenOut.address,
            amount: outputAmountRaw,
        });
    }

    // Get up to date swap result by querying onchain
    const queryOutput = (await swap.query(rpcUrl)) as
        | ExactInQueryOutput
        | ExactOutQueryOutput;

    // Construct transaction to make swap
    if (queryOutput.swapKind === SwapKind.GivenIn) {
        console.log('tokenOut:', {
            address: tokenOut.address,
            expectedAmount: queryOutput.expectedAmountOut.amount,
        });
    } else {
        console.log('tokenIn:', {
            address: tokenIn.address,
            expectedAmount: queryOutput.expectedAmountIn.amount,
        });
    }

    return { swap, chainId, queryOutput };
};

export default queryCustomPath;
