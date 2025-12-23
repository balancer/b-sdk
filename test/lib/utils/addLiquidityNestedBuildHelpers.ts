import {
    AddLiquidityNested,
    AddLiquidityNestedQueryOutputV3,
    AddLiquidityNestedCallInputV3,
    Slippage,
    Permit2,
} from '@/index';
import {
    serializeNestedCall,
    serializeNestedQueryOutput,
} from './addLiquidityTestDataHelpers';

/**
 * Builds and serializes nested call data (without permit2).
 * @param addLiquidityNested - AddLiquidityNested instance
 * @param queryOutput - Query output from SDK
 * @param slippage - Slippage tolerance
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @returns Built call and serialized call data
 */
export function buildAndSerializeNestedCall(
    addLiquidityNested: AddLiquidityNested,
    queryOutput: AddLiquidityNestedQueryOutputV3,
    slippage: Slippage,
    wethIsEth?: boolean,
): {
    call: AddLiquidityNestedCallInputV3;
    serializedCall: unknown;
} {
    const buildInput: AddLiquidityNestedCallInputV3 = {
        ...queryOutput,
        slippage,
        wethIsEth,
    };

    const call = addLiquidityNested.buildCall(buildInput);
    const serializedCall = serializeNestedCall(call);

    return { call, serializedCall };
}

/**
 * Builds and serializes nested call data (with permit2 signature).
 * @param addLiquidityNested - AddLiquidityNested instance
 * @param queryOutput - Query output from SDK
 * @param slippage - Slippage tolerance
 * @param permit2 - Permit2 signature
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @returns Built call and serialized call data
 */
export function buildAndSerializeNestedCallWithPermit2(
    addLiquidityNested: AddLiquidityNested,
    queryOutput: AddLiquidityNestedQueryOutputV3,
    slippage: Slippage,
    permit2: Permit2,
    wethIsEth?: boolean,
): {
    call: AddLiquidityNestedCallInputV3;
    serializedCall: unknown;
} {
    const buildInput: AddLiquidityNestedCallInputV3 = {
        ...queryOutput,
        slippage,
        wethIsEth,
    };

    const call = addLiquidityNested.buildCallWithPermit2(buildInput, permit2);
    const serializedCall = serializeNestedCall(call);

    return { call, serializedCall };
}

