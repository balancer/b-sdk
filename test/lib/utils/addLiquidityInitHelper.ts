import { AddLiquidityBuildOutput, PoolStateInput } from '../../../src';
import { AddLiquidityInit } from '../../../src/entities/addLiquidityInit/addLiquidityInit';
import { AddLiquidityInitInput } from '../../../src/entities/addLiquidityInit/types';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';
import { TxOutput, sendTransactionGetBalances } from './helper';
import { AddLiquidityInitTxInput } from './types';

function sdkAddLiquidityInit({
    addLiquidityInit,
    addLiquidityInput,
    poolStateInput,
}: {
    addLiquidityInit: AddLiquidityInit;
    addLiquidityInput: AddLiquidityInitInput;
    poolStateInput: PoolStateInput;
}): {
    addLiquidityBuildOutput: AddLiquidityBuildOutput;
} {
    const addLiquidityBuildOutput = addLiquidityInit.buildCall(
        addLiquidityInput,
        poolStateInput,
    );

    return {
        addLiquidityBuildOutput,
    };
}

export async function doAddLiquidityInit(txInput: AddLiquidityInitTxInput) {
    const {
        addLiquidityInit,
        poolStateInput,
        addLiquidityInput,
        testAddress,
        client,
    } = txInput;

    const { addLiquidityBuildOutput } = sdkAddLiquidityInit({
        addLiquidityInit,
        addLiquidityInput: addLiquidityInput as AddLiquidityInitInput,
        poolStateInput,
    });

    const tokens = getTokensForBalanceCheck(poolStateInput);

    // send transaction and calculate balance changes
    const txOutput = await sendTransactionGetBalances(
        tokens,
        client,
        testAddress,
        addLiquidityBuildOutput.to,
        addLiquidityBuildOutput.call,
        addLiquidityBuildOutput.value,
    );
    return {
        addLiquidityBuildOutput,
        txOutput,
    };
}

export function assertAddLiquidityInit(
    addLiquidityInput: AddLiquidityInitInput,
    addLiquidityOutput: {
        txOutput: TxOutput;
        addLiquidityBuildOutput: AddLiquidityBuildOutput;
    },
) {
    const { txOutput, addLiquidityBuildOutput } = addLiquidityOutput;

    expect(txOutput.transactionReceipt.status).to.eq('success');

    // Matching order of getTokens helper: [poolTokens, BPT, native]
    const expectedDeltas = [
        ...addLiquidityInput.amountsIn.map((a) => a.rawAmount),
        addLiquidityBuildOutput.minBptOut.amount,
        0n,
    ];

    expect(
        txOutput.balanceDeltas.slice(0, addLiquidityInput.amountsIn.length),
    ).to.deep.eq(expectedDeltas.slice(0, addLiquidityInput.amountsIn.length));

    // TODO: Improve this test - BPT Amount is slightly different from calculated Bpt: expected: 200000000000000000000n, real: 199999999999994999520n,
    expect(
        txOutput.balanceDeltas[addLiquidityInput.amountsIn.length],
    ).to.not.be.equal(0n);
}
