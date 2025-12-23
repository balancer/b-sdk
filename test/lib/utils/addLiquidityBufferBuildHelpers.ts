import {
    AddLiquidityBufferV3,
    AddLiquidityBufferQueryOutput,
    AddLiquidityBufferBuildCallOutput,
    Slippage,
    Permit2,
} from '@/index';
import { serializeBufferCall } from './addLiquidityTestDataHelpers';

/**
 * Builds buffer add liquidity call data and serializes it for comparison/saving.
 * @param addLiquidityBuffer - The AddLiquidityBufferV3 instance
 * @param queryOutput - The query output to build the call from
 * @param slippage - Slippage tolerance
 * @returns The built call and its serialized form
 */
export function buildAndSerializeBufferCall(
    addLiquidityBuffer: AddLiquidityBufferV3,
    queryOutput: AddLiquidityBufferQueryOutput,
    slippage: Slippage,
): {
    call: AddLiquidityBufferBuildCallOutput;
    serializedCall: unknown;
} {
    const call = addLiquidityBuffer.buildCall({
        ...queryOutput,
        slippage,
    });
    const serializedCall = serializeBufferCall(call);
    return { call, serializedCall };
}

/**
 * Builds buffer add liquidity call data with Permit2 and serializes it for comparison/saving.
 * @param addLiquidityBuffer - The AddLiquidityBufferV3 instance
 * @param queryOutput - The query output to build the call from
 * @param slippage - Slippage tolerance
 * @param permit2 - The Permit2 signature
 * @returns The built call and its serialized form
 */
export function buildAndSerializeBufferCallWithPermit2(
    addLiquidityBuffer: AddLiquidityBufferV3,
    queryOutput: AddLiquidityBufferQueryOutput,
    slippage: Slippage,
    permit2: Permit2,
): {
    call: AddLiquidityBufferBuildCallOutput;
    serializedCall: unknown;
} {
    const call = addLiquidityBuffer.buildCallWithPermit2(
        {
            ...queryOutput,
            slippage,
        },
        permit2,
    );
    const serializedCall = serializeBufferCall(call);
    return { call, serializedCall };
}
