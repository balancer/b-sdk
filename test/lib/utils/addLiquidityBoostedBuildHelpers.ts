import {
    AddLiquidityBoostedV3,
    AddLiquidityBoostedQueryOutput,
    AddLiquidityBuildCallOutput,
    Slippage,
    Permit2,
} from '@/index';
import { serializeBoostedCall } from './addLiquidityTestDataHelpers';

/**
 * Builds boosted add liquidity call data and serializes it for comparison/saving.
 * @param addLiquidityBoosted - The AddLiquidityBoostedV3 instance
 * @param queryOutput - The query output to build the call from
 * @param slippage - Slippage tolerance
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @returns The built call and its serialized form
 */
export function buildAndSerializeBoostedCall(
    addLiquidityBoosted: AddLiquidityBoostedV3,
    queryOutput: AddLiquidityBoostedQueryOutput,
    slippage: Slippage,
    wethIsEth: boolean,
): {
    call: AddLiquidityBuildCallOutput;
    serializedCall: unknown;
} {
    const call = addLiquidityBoosted.buildCall({
        ...queryOutput,
        slippage,
        wethIsEth,
    });
    const serializedCall = serializeBoostedCall(call);
    return { call, serializedCall };
}

/**
 * Builds boosted add liquidity call data with Permit2 and serializes it for comparison/saving.
 * @param addLiquidityBoosted - The AddLiquidityBoostedV3 instance
 * @param queryOutput - The query output to build the call from
 * @param slippage - Slippage tolerance
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @param permit2 - The Permit2 signature
 * @returns The built call and its serialized form
 */
export function buildAndSerializeBoostedCallWithPermit2(
    addLiquidityBoosted: AddLiquidityBoostedV3,
    queryOutput: AddLiquidityBoostedQueryOutput,
    slippage: Slippage,
    wethIsEth: boolean,
    permit2: Permit2,
): {
    call: AddLiquidityBuildCallOutput;
    serializedCall: unknown;
} {
    const call = addLiquidityBoosted.buildCallWithPermit2(
        {
            ...queryOutput,
            slippage,
            wethIsEth,
        },
        permit2,
    );
    const serializedCall = serializeBoostedCall(call);
    return { call, serializedCall };
}
