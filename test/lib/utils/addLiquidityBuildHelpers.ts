import {
    AddLiquidity,
    AddLiquidityQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityBuildCallInput,
    Slippage,
    Permit2,
    Address,
} from '@/index';
import { serializeCall } from './addLiquidityTestDataHelpers';

/**
 * Builds add liquidity call data and serializes it for comparison/saving.
 * @param addLiquidity - The AddLiquidity instance
 * @param queryOutput - The query output to build the call from
 * @param slippage - Slippage tolerance
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @param userData - Optional user data for V3
 * @param sender - Optional sender address (required for V2)
 * @returns The built call and its serialized form
 */
export function buildAndSerializeCall(
    addLiquidity: AddLiquidity,
    queryOutput: AddLiquidityQueryOutput,
    slippage: Slippage,
    wethIsEth: boolean,
    userData?: string,
    sender?: Address,
): {
    call: AddLiquidityBuildCallOutput;
    serializedCall: unknown;
} {
    const baseInput = {
        ...queryOutput,
        slippage,
        wethIsEth,
    };

    // V3 requires userData
    if (queryOutput.protocolVersion === 3) {
        const call = addLiquidity.buildCall({
            ...baseInput,
            userData: (userData as `0x${string}`) || '0x',
        });
        const serializedCall = serializeCall(call);
        return { call, serializedCall };
    }

    // V2 requires sender and recipient
    if (queryOutput.protocolVersion === 2) {
        if (!sender) {
            throw new Error(
                'sender is required for V2 add liquidity buildCall',
            );
        }
        const call = addLiquidity.buildCall({
            ...baseInput,
            sender,
            recipient: sender,
        });
        const serializedCall = serializeCall(call);
        return { call, serializedCall };
    }

    // V1 doesn't need sender, recipient, or userData
    if (queryOutput.protocolVersion === 1) {
        const call = addLiquidity.buildCall(
            baseInput as AddLiquidityBuildCallInput,
        );
        const serializedCall = serializeCall(call);
        return { call, serializedCall };
    }

    // This should never be reached, but TypeScript needs exhaustive check
    throw new Error(
        `Unsupported protocol version: ${queryOutput.protocolVersion}`,
    );
}

/**
 * Builds add liquidity call data with Permit2 and serializes it for comparison/saving.
 * Permit2 is only supported for V3.
 * @param addLiquidity - The AddLiquidity instance
 * @param queryOutput - The query output to build the call from (must be V3)
 * @param slippage - Slippage tolerance
 * @param wethIsEth - Whether WETH should be treated as native ETH
 * @param permit2 - The Permit2 signature
 * @param userData - Optional user data for V3
 * @returns The built call and its serialized form
 */
export function buildAndSerializeCallWithPermit2(
    addLiquidity: AddLiquidity,
    queryOutput: AddLiquidityQueryOutput,
    slippage: Slippage,
    wethIsEth: boolean,
    permit2: Permit2,
    userData?: string,
): {
    call: AddLiquidityBuildCallOutput;
    serializedCall: unknown;
} {
    if (queryOutput.protocolVersion !== 3) {
        throw new Error(
            `Permit2 is only supported for V3, but got protocol version ${queryOutput.protocolVersion}`,
        );
    }

    const baseInput = {
        ...queryOutput,
        slippage,
        wethIsEth,
    };

    const call = addLiquidity.buildCallWithPermit2(
        {
            ...baseInput,
            userData: (userData as `0x${string}`) || '0x',
        },
        permit2,
    );
    const serializedCall = serializeCall(call);
    return { call, serializedCall };
}
