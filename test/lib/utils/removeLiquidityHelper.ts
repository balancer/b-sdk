import { RemoveLiquidityTxInput } from './types';
import {
    ChainId,
    RemoveLiquidityComposableStableQueryOutput,
    RemoveLiquidityBuildOutput,
    RemoveLiquidityQueryOutput,
    NATIVE_ASSETS,
    PoolState,
    TokenAmount,
    Slippage,
    Token,
    RemoveLiquidityUnbalancedInput,
    RemoveLiquiditySingleTokenExactInInput,
    VAULT,
    RemoveLiquidityInput,
    RemoveLiquidityProportionalInput,
    removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError,
    BALANCER_ROUTER,
    RemoveLiquiditySingleTokenExactOutInput,
    RemoveLiquidityRecoveryInput,
} from '../../../src';
import { sendTransactionGetBalances, TxOutput } from './helper';
import { zeroAddress } from 'viem';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';

type RemoveLiquidityOutput = {
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput;
    removeLiquidityBuildOutput: RemoveLiquidityBuildOutput;
    txOutput: TxOutput;
};

export const sdkRemoveLiquidity = async ({
    removeLiquidity,
    removeLiquidityInput,
    poolState,
    slippage,
    testAddress,
    receiveNativeAsset,
}: Omit<RemoveLiquidityTxInput, 'client'>): Promise<{
    removeLiquidityBuildOutput: RemoveLiquidityBuildOutput;
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput;
}> => {
    const removeLiquidityQueryOutput = await removeLiquidity.query(
        removeLiquidityInput,
        poolState,
    );
    const removeLiquidityBuildOutput = removeLiquidity.buildCall({
        ...removeLiquidityQueryOutput,
        slippage,
        sender: testAddress,
        recipient: testAddress,
        chainId: removeLiquidityInput.chainId,
        receiveNativeAsset: !!receiveNativeAsset,
    });

    return {
        removeLiquidityBuildOutput,
        removeLiquidityQueryOutput,
    };
};

function isRemoveLiquidityComposableStableQueryOutput(
    output: RemoveLiquidityQueryOutput,
): boolean {
    return (
        (output as RemoveLiquidityComposableStableQueryOutput).bptIndex !==
        undefined
    );
}

function getCheck(output: RemoveLiquidityQueryOutput, isExactIn: boolean) {
    if (isRemoveLiquidityComposableStableQueryOutput(output)) {
        if (isExactIn) {
            // Using this destructuring to return only the fields of interest
            // biome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { amountsOut, bptIndex, ...check } =
                output as RemoveLiquidityComposableStableQueryOutput;
            return check;
        }
        // biome-ignore lint/correctness/noUnusedVariables: <explanation>
        const { bptIn, bptIndex, ...check } =
            output as RemoveLiquidityComposableStableQueryOutput;
        return check;
    }
    if (isExactIn) {
        // biome-ignore lint/correctness/noUnusedVariables: <explanation>
        const { amountsOut, ...check } = output;
        return check;
    }
    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { bptIn, ...check } = output;
    return check;
}

/**
 * Create and submit remove liquidity transaction.
 * @param txInput
 *     @param client: Client & PublicActions & WalletActions - The RPC client
 *     @param removeLiquidity: RemoveLiquidity - The remove liquidity class, used to query outputs and build transaction call
 *     @param removeLiquidityInput: RemoveLiquidityInput - The parameters of the transaction, example: bptIn, amountsOut, etc.
 *     @param slippage: Slippage - The slippage tolerance for the transaction
 *     @param poolState: PoolState - The state of the pool
 *     @param testAddress: Address - The address to send the transaction from
 *  */
export async function doRemoveLiquidity(txInput: RemoveLiquidityTxInput) {
    const {
        removeLiquidity,
        poolState,
        removeLiquidityInput,
        testAddress,
        client,
        slippage,
        receiveNativeAsset,
    } = txInput;

    const { removeLiquidityQueryOutput, removeLiquidityBuildOutput } =
        await sdkRemoveLiquidity({
            removeLiquidity,
            removeLiquidityInput,
            poolState,
            slippage,
            testAddress,
            receiveNativeAsset,
        });

    // get tokens for balance change - pool tokens, BPT, native
    const tokens = getTokensForBalanceCheck(poolState);

    // send transaction and calculate balance changes
    const txOutput = await sendTransactionGetBalances(
        tokens,
        client,
        testAddress,
        removeLiquidityBuildOutput.to,
        removeLiquidityBuildOutput.call,
        removeLiquidityBuildOutput.value,
    );

    return {
        removeLiquidityQueryOutput,
        removeLiquidityBuildOutput,
        txOutput,
    };
}

export function assertRemoveLiquidityUnbalanced(
    chainId: ChainId,
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquidityUnbalancedInput,
    removeLiquidityOutput: RemoveLiquidityOutput,
    slippage: Slippage,
    receiveNativeAsset?: boolean,
) {
    const { txOutput, removeLiquidityQueryOutput, removeLiquidityBuildOutput } =
        removeLiquidityOutput;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsOut = poolState.tokens.map((t) => {
        const token = new Token(chainId, t.address, t.decimals);
        const input = removeLiquidityInput.amountsOut.find(
            (a) => a.address === t.address,
        );
        if (input === undefined) return TokenAmount.fromRawAmount(token, 0n);
        return TokenAmount.fromRawAmount(token, input.rawAmount);
    });

    const expectedQueryOutput: Omit<
        RemoveLiquidityQueryOutput,
        'bptIn' | 'bptIndex'
    > = {
        // Query should use same amountsOut as input
        amountsOut: expectedAmountsOut,
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        toInternalBalance: !!removeLiquidityInput.toInternalBalance,
        removeLiquidityKind: removeLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, false);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect some bpt amount
    expect(removeLiquidityQueryOutput.bptIn.amount > 0n).to.be.true;

    assertRemoveLiquidityBuildOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildOutput,
        false,
        slippage,
        chainId,
    );

    assertTokenDeltas(
        poolState,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
        receiveNativeAsset,
    );
}

export function assertRemoveLiquiditySingleTokenExactOut(
    chainId: ChainId,
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquiditySingleTokenExactOutInput,
    removeLiquidityOutput: RemoveLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    receiveNativeAsset?: boolean,
) {
    const { txOutput, removeLiquidityQueryOutput, removeLiquidityBuildOutput } =
        removeLiquidityOutput;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsOut = poolState.tokens.map((t) => {
        const token = new Token(chainId, t.address, t.decimals);
        const input = removeLiquidityInput.amountOut;
        if (input.address !== t.address) {
            return TokenAmount.fromRawAmount(token, 0n);
        }
        return TokenAmount.fromRawAmount(token, input.rawAmount);
    });

    const tokensWithoutBpt = poolState.tokens.filter(
        (t) => t.address !== poolState.address,
    );

    const expectedQueryOutput: Omit<
        RemoveLiquidityQueryOutput,
        'bptIn' | 'bptIndex'
    > = {
        // Query should use same amountsOut as input
        amountsOut: expectedAmountsOut,
        tokenOutIndex: tokensWithoutBpt.findIndex(
            (t) => t.address === removeLiquidityInput.amountOut.address,
        ),
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        toInternalBalance: !!removeLiquidityInput.toInternalBalance,
        removeLiquidityKind: removeLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, false);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect some bpt amount
    expect(removeLiquidityQueryOutput.bptIn.amount > 0n).to.be.true;

    assertRemoveLiquidityBuildOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildOutput,
        false,
        slippage,
        chainId,
        vaultVersion,
    );

    assertTokenDeltas(
        poolState,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
        receiveNativeAsset,
    );
}

export function assertRemoveLiquiditySingleTokenExactIn(
    chainId: ChainId,
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquiditySingleTokenExactInInput,
    removeLiquidityOutput: RemoveLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    receiveNativeAsset?: boolean,
) {
    const { txOutput, removeLiquidityQueryOutput, removeLiquidityBuildOutput } =
        removeLiquidityOutput;

    if (removeLiquidityQueryOutput.tokenOutIndex === undefined)
        throw removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError;

    const bptToken = new Token(chainId, poolState.address, 18);

    const tokensWithoutBpt = poolState.tokens.filter(
        (t) => t.address !== poolState.address,
    );

    const expectedQueryOutput: Omit<
        RemoveLiquidityQueryOutput,
        'amountsOut' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptIn: TokenAmount.fromRawAmount(
            bptToken,
            removeLiquidityInput.bptIn.rawAmount,
        ),
        tokenOutIndex: tokensWithoutBpt.findIndex(
            (t) => t.address === removeLiquidityInput.tokenOut,
        ),
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        toInternalBalance: !!removeLiquidityInput.toInternalBalance,
        removeLiquidityKind: removeLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect only tokenOut to have amount > 0
    // (Note removeLiquidityQueryOutput also has value for bpt if pre-minted)
    removeLiquidityQueryOutput.amountsOut.forEach((a) => {
        if (
            vaultVersion === 2 &&
            receiveNativeAsset &&
            a.token.address === zeroAddress
        ) {
            expect(a.amount > 0n).to.be.true;
        } else if (a.token.address === removeLiquidityInput.tokenOut) {
            expect(a.amount > 0n).to.be.true;
        } else {
            expect(a.amount).toEqual(0n);
        }
    });

    assertRemoveLiquidityBuildOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildOutput,
        true,
        slippage,
        chainId,
        vaultVersion,
    );

    assertTokenDeltas(
        poolState,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
        receiveNativeAsset,
    );
}

export function assertRemoveLiquidityProportional(
    chainId: ChainId,
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquidityProportionalInput,
    removeLiquidityOutput: RemoveLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    receiveNativeAsset?: boolean,
) {
    const { txOutput, removeLiquidityQueryOutput, removeLiquidityBuildOutput } =
        removeLiquidityOutput;

    const bptToken = new Token(chainId, poolState.address, 18);

    const expectedQueryOutput: Omit<
        RemoveLiquidityQueryOutput,
        'amountsOut' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptIn: TokenAmount.fromRawAmount(
            bptToken,
            removeLiquidityInput.bptIn.rawAmount,
        ),
        // Only expect tokenInIndex for AddLiquiditySingleToken
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        toInternalBalance: !!removeLiquidityInput.toInternalBalance,
        removeLiquidityKind: removeLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect all assets in to have an amount > 0 apart from BPT if it exists
    removeLiquidityQueryOutput.amountsOut.forEach((a) => {
        if (a.token.address === poolState.address) expect(a.amount).toEqual(0n);
        else expect(a.amount > 0n).to.be.true;
    });

    if (receiveNativeAsset) {
        expect(
            removeLiquidityQueryOutput.amountsOut.some((a) =>
                a.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped),
            ),
        ).to.be.true;
    }

    assertRemoveLiquidityBuildOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildOutput,
        true,
        slippage,
        chainId,
        vaultVersion,
    );

    assertTokenDeltas(
        poolState,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
        receiveNativeAsset,
    );
}

export function assertRemoveLiquidityRecovery(
    chainId: ChainId,
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquidityRecoveryInput,
    removeLiquidityOutput: RemoveLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    receiveNativeAsset?: boolean,
) {
    const { txOutput, removeLiquidityQueryOutput, removeLiquidityBuildOutput } =
        removeLiquidityOutput;

    const bptToken = new Token(chainId, poolState.address, 18);

    const expectedQueryOutput: Omit<
        RemoveLiquidityQueryOutput,
        'amountsOut' | 'bptIndex'
    > = {
        // Query should use same bpt out as user sets
        bptIn: TokenAmount.fromRawAmount(
            bptToken,
            removeLiquidityInput.bptIn.rawAmount,
        ),
        // Only expect tokenInIndex for AddLiquiditySingleToken
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        toInternalBalance: !!removeLiquidityInput.toInternalBalance,
        removeLiquidityKind: removeLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect all assets in to have an amount > 0 apart from BPT if it exists
    removeLiquidityQueryOutput.amountsOut.forEach((a) => {
        if (a.token.address === poolState.address) expect(a.amount).toEqual(0n);
        else expect(a.amount > 0n).to.be.true;
    });

    if (receiveNativeAsset) {
        expect(
            removeLiquidityQueryOutput.amountsOut.some((a) =>
                a.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped),
            ),
        ).to.be.true;
    }

    assertRemoveLiquidityBuildOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildOutput,
        true,
        slippage,
        chainId,
        vaultVersion,
    );

    assertTokenDeltas(
        poolState,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
        receiveNativeAsset,
    );
}

function assertTokenDeltas(
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquidityInput,
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput,
    txOutput: TxOutput,
    receiveNativeAsset?: boolean,
) {
    expect(txOutput.transactionReceipt.status).to.eq('success');

    // removeLiquidityQueryOutput amountsOut will have a value for the BPT token if it is a pre-minted pool
    const amountsWithoutBpt = [...removeLiquidityQueryOutput.amountsOut].filter(
        (t) => t.token.address !== poolState.address,
    );

    // Matching order of getTokens helper: [poolTokens, BPT, native]
    const expectedDeltas = [
        ...amountsWithoutBpt.map((a) => a.amount),
        removeLiquidityQueryOutput.bptIn.amount,
        0n,
    ];

    // If removing liquidity to native asset we must replace it with 0 and update native value instead
    if (receiveNativeAsset) {
        const nativeAssetIndex = amountsWithoutBpt.findIndex((a) =>
            a.token.isSameAddress(
                NATIVE_ASSETS[removeLiquidityInput.chainId].wrapped,
            ),
        );
        expectedDeltas[expectedDeltas.length - 1] =
            expectedDeltas[nativeAssetIndex];
        expectedDeltas[nativeAssetIndex] = 0n;
    }
    const balanceVsExpectedDeltas = txOutput.balanceDeltas.map(
        (balanceDelta, index) => {
            const delta = balanceDelta - expectedDeltas[index];
            return Math.abs(parseInt(delta.toString()));
        },
    );
    //The Balance Delta for Recovery Exits has rounding errors, since the query is done for proportional exits
    balanceVsExpectedDeltas.forEach((diff) => {
        expect(diff).to.be.lessThanOrEqual(1);
    });
}

function assertRemoveLiquidityBuildOutput(
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput,
    RemoveLiquidityBuildOutput: RemoveLiquidityBuildOutput,
    isExactIn: boolean,
    slippage: Slippage,
    chainId: number,
    vaultVersion: 2 | 3 = 2,
) {
    // if exactIn minAmountsOut should use amountsOut with slippage applied, else should use same amountsOut as input
    // slippage.applyTo(a.amount, -1)
    const minAmountsOut = isExactIn
        ? removeLiquidityQueryOutput.amountsOut.map((a) =>
              TokenAmount.fromRawAmount(
                  a.token,
                  slippage.applyTo(a.amount, -1),
              ),
          )
        : [...removeLiquidityQueryOutput.amountsOut];

    // if exactIn slippage cannot be applied to bptIn, else should use bptIn with slippage applied
    const maxBptIn = isExactIn
        ? ({ ...removeLiquidityQueryOutput.bptIn } as TokenAmount)
        : TokenAmount.fromRawAmount(
              removeLiquidityQueryOutput.bptIn.token,
              slippage.applyTo(removeLiquidityQueryOutput.bptIn.amount),
          );

    const to = vaultVersion === 2 ? VAULT[chainId] : BALANCER_ROUTER[chainId];

    const expectedBuildOutput: Omit<RemoveLiquidityBuildOutput, 'call'> = {
        minAmountsOut,
        maxBptIn,
        to,
        value: 0n, // Value should always be 0 when removing liquidity
    };

    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { call, ...buildCheck } = RemoveLiquidityBuildOutput;
    expect(buildCheck).to.deep.eq(expectedBuildOutput);
}
