import {
    Swap,
    Slippage,
    ExactInQueryOutput,
    ExactOutQueryOutput,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    Permit2,
} from '@/index';
import { serializeCallData } from './swapTestDataHelpers';

/**
 * Builds swap call data and serializes it for comparison/saving.
 * @param swap - The Swap instance
 * @param queryOutput - The query output to build the call from
 * @param slippage - Slippage tolerance
 * @param deadline - Transaction deadline
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @returns The built call and its serialized form
 */
export function buildAndSerializeCall(
    swap: Swap,
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput,
    slippage: Slippage,
    deadline: bigint,
    wethIsEth: boolean,
): {
    call: SwapBuildOutputExactIn | SwapBuildOutputExactOut;
    serializedCall: unknown;
} {
    const call = swap.buildCall({
        slippage,
        deadline,
        queryOutput,
        wethIsEth,
    });

    const serializedCall = serializeCallData(call);

    return { call, serializedCall };
}

/**
 * Builds swap call data with Permit2 and serializes it for comparison/saving.
 * @param swap - The Swap instance
 * @param queryOutput - The query output to build the call from
 * @param slippage - Slippage tolerance
 * @param deadline - Transaction deadline
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @param permit2 - The Permit2 signature
 * @returns The built call and its serialized form
 */
export function buildAndSerializeCallWithPermit2(
    swap: Swap,
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput,
    slippage: Slippage,
    deadline: bigint,
    wethIsEth: boolean,
    permit2: Permit2,
): {
    call: SwapBuildOutputExactIn | SwapBuildOutputExactOut;
    serializedCall: unknown;
} {
    const call = swap.buildCallWithPermit2(
        {
            slippage,
            deadline,
            queryOutput,
            wethIsEth,
        },
        permit2,
    );

    const serializedCall = serializeCallData(call);

    return { call, serializedCall };
}

