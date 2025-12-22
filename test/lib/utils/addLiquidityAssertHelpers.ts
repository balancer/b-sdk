import { Address, TestActions } from 'viem';
import {
    AddLiquidityQueryOutput,
    AddLiquidityBuildCallOutput,
    ChainId,
    PublicWalletClient,
    PoolState,
    Slippage,
} from '@/index';
import { expect } from 'vitest';
import { sendTransactionGetBalances, TxOutput } from './helper';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';
import {
    assertAddLiquidityUnbalanced,
    assertAddLiquiditySingleToken,
    assertAddLiquidityProportional,
} from './addLiquidityHelper';
import {
    AddLiquidityUnbalancedInput,
    AddLiquiditySingleTokenInput,
    AddLiquidityProportionalInput,
    AddLiquidityInput,
    AddLiquidityKind,
} from '@/index';

/**
 * Runs full integration test assertions for add liquidity.
 * Sends the transaction and verifies results using existing assertion helpers.
 * @param params - Parameters for the assertion
 */
export async function assertAddLiquidityResultWithForkTest({
    addLiquidityInput,
    poolState,
    chainId,
    client,
    testAddress,
    call,
    queryOutput,
    slippage,
    wethIsEth,
}: {
    addLiquidityInput: AddLiquidityInput;
    poolState: PoolState;
    chainId: ChainId;
    client?: PublicWalletClient & TestActions;
    testAddress: Address;
    call: AddLiquidityBuildCallOutput;
    queryOutput: AddLiquidityQueryOutput;
    slippage: Slippage;
    wethIsEth?: boolean;
}): Promise<void> {
    // Run full integration assertions - client must be available
    if (!client) {
        throw new Error(
            'Cannot run integration assertions: client not initialized and no saved test data available. ' +
                'Either initialize a test client or ensure saved test data exists for this test case.',
        );
    }

    const tokens = getTokensForBalanceCheck(poolState);

    // Send transaction and calculate balance changes
    const txOutput: TxOutput = await sendTransactionGetBalances(
        tokens,
        client,
        testAddress,
        call.to,
        call.callData,
        call.value,
    );

    // Use existing assertion helpers based on add liquidity kind
    const addLiquidityOutput = {
        addLiquidityQueryOutput: queryOutput,
        addLiquidityBuildCallOutput: call,
        txOutput,
    };

    const protocolVersion = poolState.protocolVersion as 2 | 3;

    if (addLiquidityInput.kind === AddLiquidityKind.Unbalanced) {
        assertAddLiquidityUnbalanced(
            poolState,
            addLiquidityInput as AddLiquidityUnbalancedInput,
            addLiquidityOutput,
            slippage,
            chainId,
            protocolVersion,
            wethIsEth,
        );
    } else if (addLiquidityInput.kind === AddLiquidityKind.SingleToken) {
        assertAddLiquiditySingleToken(
            poolState,
            addLiquidityInput as AddLiquiditySingleTokenInput,
            addLiquidityOutput,
            slippage,
            chainId,
            protocolVersion,
            wethIsEth,
        );
    } else {
        assertAddLiquidityProportional(
            poolState,
            addLiquidityInput as AddLiquidityProportionalInput,
            addLiquidityOutput,
            slippage,
            chainId,
            protocolVersion,
            wethIsEth,
        );
    }
}

/**
 * Compares built call data against saved test data.
 * CallData should match even for permit2 signature tests because the permit2 signature
 * is saved and reloaded, making the callData deterministic.
 * @param builtCall - The built call data
 * @param savedData - The saved test data
 */
export function assertAddLiquidityResultWithSavedData(
    builtCall: AddLiquidityBuildCallOutput,
    savedData: { call: unknown; permit2?: unknown },
) {
    const savedCall = savedData.call as {
        to: Address;
        callData: string;
        value: string;
        minBptOut: unknown;
        maxAmountsIn: unknown[];
    };
    expect(builtCall.callData).to.deep.equal(savedCall.callData);
    expect(builtCall.to).to.equal(savedCall.to);
    expect(builtCall.value).to.equal(BigInt(savedCall.value));
}
