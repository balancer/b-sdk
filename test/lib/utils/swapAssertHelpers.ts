import { Address, TestActions } from 'viem';
import {
    Swap,
    ChainId,
    SwapKind,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
    ExactInQueryOutput,
    ExactOutQueryOutput,
    PublicWalletClient,
} from '@/index';
import { expect } from 'vitest';
import { assertResultExactIn, assertResultExactOut } from './swapHelpers';
import { TEST_CONSTANTS } from '../../entities/swaps/v3/swapTestConfig';

export async function assertSwapResultWithForkTest({
    swap,
    chainId,
    routerAddress,
    client,
    testAddress,
    call,
    queryOutput,
    swapKind,
    wethIsEth,
    outputTest,
}: {
    swap: Swap;
    chainId: ChainId;
    routerAddress: Address;
    client?: PublicWalletClient & TestActions;
    testAddress: Address;
    call: SwapBuildOutputExactIn | SwapBuildOutputExactOut;
    queryOutput: ExactInQueryOutput | ExactOutQueryOutput;
    swapKind: SwapKind;
    wethIsEth: boolean;
    outputTest?: {
        testExactOutAmount: boolean;
        percentage: number;
    };
}): Promise<void> {
    // Run full integration assertions - client must be available
    if (!client) {
        throw new Error(
            'Cannot run integration assertions: client not initialized and no saved test data available',
        );
    }
    if (swapKind === SwapKind.GivenIn) {
        await assertResultExactIn({
            wethIsEth,
            swap,
            chainId,
            contractToCall: routerAddress,
            client,
            testAddress,
            call: call as SwapBuildOutputExactIn,
            outputTest: outputTest || TEST_CONSTANTS.defaultOutputTest,
            exactInQueryOutput: queryOutput as ExactInQueryOutput,
        });
    } else {
        await assertResultExactOut({
            wethIsEth,
            swap,
            chainId,
            contractToCall: routerAddress,
            client,
            testAddress,
            call: call as SwapBuildOutputExactOut,
            exactOutQueryOutput: queryOutput as ExactOutQueryOutput,
        });
    }
}

export function assertSwapResultWithSavedData(
    builtCall: SwapBuildOutputExactIn | SwapBuildOutputExactOut,
    savedData: { call: { to: Address; callData: string; value: string } },
) {
    expect(builtCall.callData).to.deep.equal(savedData.call.callData);
    expect(builtCall.to).to.equal(savedData.call.to);
    expect(builtCall.value).to.equal(BigInt(savedData.call.value));
}
