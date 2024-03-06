import {
    AddLiquidity,
    AddLiquidityInput,
    PoolState,
    Slippage,
    Address,
    AddLiquidityBuildOutput,
    AddLiquidityQueryOutput,
    AddLiquidityUnbalancedInput,
    VAULT,
    AddLiquiditySingleTokenInput,
    AddLiquidityProportionalInput,
    Token,
    ChainId,
    TokenAmount,
    AddLiquidityComposableStableQueryOutput,
    NATIVE_ASSETS,
    BALANCER_ROUTER,
} from '../../../src';
import { TxOutput, sendTransactionGetBalances } from './helper';
import { AddLiquidityTxInput } from './types';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';
import { addLiquiditySingleTokenShouldHaveTokenInIndexError } from '../../../src/utils/errors';

type AddLiquidityOutput = {
    addLiquidityQueryOutput: AddLiquidityQueryOutput;
    addLiquidityBuildOutput: AddLiquidityBuildOutput;
    txOutput: TxOutput;
};

async function sdkAddLiquidity({
    addLiquidity,
    addLiquidityInput,
    poolState,
    slippage,
    testAddress,
    sendNativeAsset,
}: {
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    poolState: PoolState;
    slippage: Slippage;
    testAddress: Address;
    sendNativeAsset?: boolean;
}): Promise<{
    addLiquidityBuildOutput: AddLiquidityBuildOutput;
    addLiquidityQueryOutput: AddLiquidityQueryOutput;
}> {
    const addLiquidityQueryOutput = await addLiquidity.query(
        addLiquidityInput,
        poolState,
    );
    const addLiquidityBuildOutput = addLiquidity.buildCall({
        ...addLiquidityQueryOutput,
        slippage,
        sender: testAddress,
        recipient: testAddress,
        chainId: addLiquidityInput.chainId,
        sendNativeAsset: !!sendNativeAsset,
    });

    return {
        addLiquidityBuildOutput,
        addLiquidityQueryOutput,
    };
}

function isAddLiquidityComposableStableQueryOutput(
    output: AddLiquidityQueryOutput,
): boolean {
    return (
        (output as AddLiquidityComposableStableQueryOutput).bptIndex !==
        undefined
    );
}

function getCheck(output: AddLiquidityQueryOutput, isExactIn: boolean) {
    if (isAddLiquidityComposableStableQueryOutput(output)) {
        if (isExactIn) {
            // Using this destructuring to return only the fields of interest
            // biome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { bptOut, bptIndex, ...check } =
                output as AddLiquidityComposableStableQueryOutput;
            return check;
        }
        // biome-ignore lint/correctness/noUnusedVariables: <explanation>
        const { amountsIn, bptIndex, ...check } =
            output as AddLiquidityComposableStableQueryOutput;
        return check;
    }
    if (isExactIn) {
        // biome-ignore lint/correctness/noUnusedVariables: <explanation>
        const { bptOut, ...check } = output;
        return check;
    }
    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { amountsIn, ...check } = output;
    return check;
}

/**
 * Create and submit add liquidity transaction.
 * @param txInput
 *      @param addLiquidity: AddLiquidity - The add liquidity class, used to query outputs and build transaction call
 *      @param poolInput: PoolState - The state of the pool
 *      @param addLiquidityInput: AddLiquidityInput - The parameters of the transaction, example: bptOut, amountsIn, etc.
 *      @param testAddress: Address - The address to send the transaction from
 *      @param client: Client & PublicActions & WalletActions - The RPC client
 *      @param slippage: Slippage - The slippage tolerance for the transaction
 */
export async function doAddLiquidity(txInput: AddLiquidityTxInput) {
    const {
        addLiquidity,
        poolState,
        addLiquidityInput,
        testAddress,
        client,
        slippage,
        sendNativeAsset,
    } = txInput;

    const { addLiquidityQueryOutput, addLiquidityBuildOutput } =
        await sdkAddLiquidity({
            addLiquidity,
            addLiquidityInput,
            poolState,
            slippage,
            testAddress,
            sendNativeAsset,
        });

    const tokens = getTokensForBalanceCheck(poolState);

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
        addLiquidityQueryOutput,
        addLiquidityBuildOutput,
        txOutput,
    };
}

export function assertAddLiquidityUnbalanced(
    chainId: ChainId,
    poolState: PoolState,
    addLiquidityInput: AddLiquidityUnbalancedInput,
    addLiquidityOutput: AddLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    sendNativeAsset?: boolean,
) {
    const { txOutput, addLiquidityQueryOutput, addLiquidityBuildOutput } =
        addLiquidityOutput;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsIn = poolState.tokens.map((t) => {
        const token = new Token(chainId, t.address, t.decimals);
        const input = addLiquidityInput.amountsIn.find(
            (a) => a.address === t.address,
        );
        if (input === undefined) return TokenAmount.fromRawAmount(token, 0n);
        return TokenAmount.fromRawAmount(token, input.rawAmount);
    });

    const expectedQueryOutput: Omit<
        AddLiquidityQueryOutput,
        'bptOut' | 'bptIndex'
    > = {
        // Query should use same amountsIn as input
        amountsIn: expectedAmountsIn,
        tokenInIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        fromInternalBalance: !!addLiquidityInput.fromInternalBalance,
        addLiquidityKind: addLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
    };

    const queryCheck = getCheck(addLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect some bpt amount
    expect(addLiquidityQueryOutput.bptOut.amount > 0n).to.be.true;

    assertAddLiquidityBuildOutput(
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildOutput,
        true,
        slippage,
        vaultVersion,
        sendNativeAsset,
    );

    assertTokenDeltas(
        poolState,
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildOutput,
        txOutput,
        sendNativeAsset,
    );
}

export function assertAddLiquiditySingleToken(
    chainId: ChainId,
    poolState: PoolState,
    addLiquidityInput: AddLiquiditySingleTokenInput,
    addLiquidityOutput: AddLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    sendNativeAsset?: boolean,
) {
    const { txOutput, addLiquidityQueryOutput, addLiquidityBuildOutput } =
        addLiquidityOutput;

    if (addLiquidityQueryOutput.tokenInIndex === undefined)
        throw addLiquiditySingleTokenShouldHaveTokenInIndexError;

    const bptToken = new Token(chainId, poolState.address, 18);

    const tokensWithoutBpt = poolState.tokens.filter(
        (t) => t.address !== poolState.address,
    );

    const expectedQueryOutput: Omit<
        AddLiquidityQueryOutput,
        'amountsIn' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptOut: TokenAmount.fromRawAmount(
            bptToken,
            addLiquidityInput.bptOut.rawAmount,
        ),
        tokenInIndex: tokensWithoutBpt.findIndex(
            (t) => t.address === addLiquidityInput.tokenIn,
        ),
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        fromInternalBalance: !!addLiquidityInput.fromInternalBalance,
        addLiquidityKind: addLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
    };

    const queryCheck = getCheck(addLiquidityQueryOutput, false);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect only tokenIn to have amount > 0
    // (Note addLiquidityQueryOutput also has value for bpt if pre-minted)
    addLiquidityQueryOutput.amountsIn.forEach((a) => {
        if (a.token.address === addLiquidityInput.tokenIn) {
            expect(a.amount > 0n).to.be.true;
        } else {
            expect(a.amount).toEqual(0n);
        }
    });

    assertAddLiquidityBuildOutput(
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildOutput,
        false,
        slippage,
        vaultVersion,
        sendNativeAsset,
    );

    assertTokenDeltas(
        poolState,
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildOutput,
        txOutput,
        sendNativeAsset,
    );
}

export function assertAddLiquidityProportional(
    chainId: ChainId,
    poolState: PoolState,
    addLiquidityInput: AddLiquidityProportionalInput,
    addLiquidityOutput: AddLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    sendNativeAsset?: boolean,
) {
    const { txOutput, addLiquidityQueryOutput, addLiquidityBuildOutput } =
        addLiquidityOutput;

    const bptToken = new Token(chainId, poolState.address, 18);

    const expectedQueryOutput: Omit<
        AddLiquidityQueryOutput,
        'amountsIn' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptOut: TokenAmount.fromRawAmount(
            bptToken,
            addLiquidityInput.bptOut.rawAmount,
        ),
        // Only expect tokenInIndex for AddLiquiditySingleToken
        tokenInIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        fromInternalBalance: !!addLiquidityInput.fromInternalBalance,
        addLiquidityKind: addLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
    };

    const queryCheck = getCheck(addLiquidityQueryOutput, false);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect all assets in to have an amount > 0 apart from BPT if it exists
    addLiquidityQueryOutput.amountsIn.forEach((a) => {
        if (a.token.address === poolState.address) expect(a.amount).toEqual(0n);
        else expect(a.amount > 0n).to.be.true;
    });

    assertAddLiquidityBuildOutput(
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildOutput,
        false,
        slippage,
        vaultVersion,
        sendNativeAsset,
    );

    if (sendNativeAsset) {
        expect(
            addLiquidityOutput.addLiquidityQueryOutput.amountsIn.some((t) =>
                t.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped),
            ),
        ).to.be.true;
    }

    assertTokenDeltas(
        poolState,
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildOutput,
        txOutput,
        sendNativeAsset,
    );
}

function assertTokenDeltas(
    poolState: PoolState,
    addLiquidityInput: AddLiquidityInput,
    addLiquidityQueryOutput: AddLiquidityQueryOutput,
    addLiquidityBuildOutput: AddLiquidityBuildOutput,
    txOutput: TxOutput,
    sendNativeAsset?: boolean,
) {
    expect(txOutput.transactionReceipt.status).to.eq('success');

    // addLiquidityQueryOutput amountsIn will have a value for the BPT token if it is a pre-minted pool
    const amountsWithoutBpt = [...addLiquidityQueryOutput.amountsIn].filter(
        (t) => t.token.address !== poolState.address,
    );

    // Matching order of getTokens helper: [poolTokens, BPT, native]
    const expectedDeltas = [
        ...amountsWithoutBpt.map((a) => a.amount),
        addLiquidityQueryOutput.bptOut.amount,
        0n,
    ];

    /**
     * Since native asset was moved to an extra index, we need to identify its
     * respective amount within the amounts array and move it to that index.
     * - Balancer V2: zero address represents the native asset
     * - Balancer V3: WETH address represents the native asset (in combination with sendNativeAsset flag)
     */
    if (sendNativeAsset) {
        const nativeAssetIndex = amountsWithoutBpt.findIndex((a) =>
            a.token.isSameAddress(
                NATIVE_ASSETS[addLiquidityInput.chainId].wrapped,
            ),
        );
        expectedDeltas[nativeAssetIndex] = 0n;
        expectedDeltas[expectedDeltas.length - 1] =
            addLiquidityBuildOutput.value;
    }

    expect(txOutput.balanceDeltas).to.deep.eq(expectedDeltas);
}

function assertAddLiquidityBuildOutput(
    addLiquidityInput: AddLiquidityInput,
    addLiquidityQueryOutput: AddLiquidityQueryOutput,
    addLiquidityBuildOutput: AddLiquidityBuildOutput,
    isExactIn: boolean,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    sendNativeAsset?: boolean,
) {
    // if exactIn maxAmountsIn should use same amountsIn as input else slippage should be applied
    const maxAmountsIn = isExactIn
        ? [...addLiquidityQueryOutput.amountsIn]
        : addLiquidityQueryOutput.amountsIn.map((a) =>
              TokenAmount.fromRawAmount(a.token, slippage.applyTo(a.amount)),
          );

    // if exactIn slippage should be applied to bptOut else should use same bptOut as input
    const minBptOut = isExactIn
        ? TokenAmount.fromRawAmount(
              addLiquidityQueryOutput.bptOut.token,
              slippage.applyTo(addLiquidityQueryOutput.bptOut.amount, -1),
          )
        : ({ ...addLiquidityQueryOutput.bptOut } as TokenAmount);

    // user interacts with the router on balancer v3
    const to =
        vaultVersion === 2
            ? VAULT[addLiquidityInput.chainId]
            : BALANCER_ROUTER[addLiquidityInput.chainId];

    let value = 0n;
    if (sendNativeAsset) {
        value =
            addLiquidityQueryOutput.amountsIn.find((a) =>
                a.token.isSameAddress(
                    NATIVE_ASSETS[addLiquidityInput.chainId].wrapped,
                ),
            )?.amount ?? 0n;
    }

    const expectedBuildOutput: Omit<AddLiquidityBuildOutput, 'call'> = {
        maxAmountsIn,
        minBptOut,
        to,
        value,
    };

    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { call, ...buildCheck } = addLiquidityBuildOutput;
    expect(buildCheck).to.deep.eq(expectedBuildOutput);
}
