import { zeroAddress } from 'viem';
import {
    BALANCER_ROUTER,
    NATIVE_ASSETS,
    PoolState,
    RemoveLiquidityBuildCallInput,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityInput,
    RemoveLiquidityProportionalInput,
    RemoveLiquidityQueryOutput,
    RemoveLiquidityRecoveryInput,
    RemoveLiquiditySingleTokenExactInInput,
    removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError,
    RemoveLiquiditySingleTokenExactOutInput,
    RemoveLiquidityUnbalancedInput,
    Slippage,
    Token,
    TokenAmount,
    VAULT,
} from 'src';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';
import { sendTransactionGetBalances, TxOutput } from './helper';
import {
    RemoveLiquidityRecoveryTxInput,
    RemoveLiquidityTxInput,
} from './types';
import { RemoveLiquidityV2BaseBuildCallInput } from '@/entities/removeLiquidity/removeLiquidityV2/types';
import { RemoveLiquidityV2ComposableStableQueryOutput } from '@/entities/removeLiquidity/removeLiquidityV2/composableStable/types';

export type RemoveLiquidityOutput = {
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput;
    removeLiquidityBuildCallOutput: RemoveLiquidityBuildCallOutput;
    txOutput: TxOutput;
};

export const sdkRemoveLiquidity = async ({
    removeLiquidity,
    removeLiquidityInput,
    poolState,
    slippage,
    testAddress,
    wethIsEth,
    toInternalBalance,
}: Omit<RemoveLiquidityTxInput, 'client'>): Promise<{
    removeLiquidityBuildCallOutput: RemoveLiquidityBuildCallOutput;
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput;
}> => {
    const removeLiquidityQueryOutput = await removeLiquidity.query(
        removeLiquidityInput,
        poolState,
    );

    let removeLiquidityBuildInput: RemoveLiquidityBuildCallInput = {
        ...removeLiquidityQueryOutput,
        slippage,
        wethIsEth: !!wethIsEth,
    };
    if (poolState.vaultVersion === 2) {
        (removeLiquidityBuildInput as RemoveLiquidityV2BaseBuildCallInput) = {
            ...removeLiquidityBuildInput,
            sender: testAddress,
            recipient: testAddress,
            toInternalBalance: !!toInternalBalance,
        };
    }

    const removeLiquidityBuildCallOutput = removeLiquidity.buildCall(
        removeLiquidityBuildInput,
    );

    return {
        removeLiquidityBuildCallOutput,
        removeLiquidityQueryOutput,
    };
};

export const sdkRemoveLiquidityRecovery = async ({
    removeLiquidity,
    removeLiquidityRecoveryInput,
    poolStateWithBalances,
    slippage,
    testAddress,
    wethIsEth,
    toInternalBalance,
}: Omit<RemoveLiquidityRecoveryTxInput, 'client'>): Promise<{
    removeLiquidityBuildCallOutput: RemoveLiquidityBuildCallOutput;
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput;
}> => {
    const removeLiquidityQueryOutput =
        removeLiquidity.queryRemoveLiquidityRecovery(
            removeLiquidityRecoveryInput,
            poolStateWithBalances,
        );

    let removeLiquidityBuildInput: RemoveLiquidityBuildCallInput = {
        ...removeLiquidityQueryOutput,
        slippage,
        wethIsEth: !!wethIsEth,
    };
    if (poolStateWithBalances.vaultVersion === 2) {
        (removeLiquidityBuildInput as RemoveLiquidityV2BaseBuildCallInput) = {
            ...removeLiquidityBuildInput,
            sender: testAddress,
            recipient: testAddress,
            toInternalBalance: !!toInternalBalance,
        };
    }

    const removeLiquidityBuildCallOutput = removeLiquidity.buildCall(
        removeLiquidityBuildInput,
    );

    return {
        removeLiquidityBuildCallOutput,
        removeLiquidityQueryOutput,
    };
};

function isRemoveLiquidityV2ComposableStableQueryOutput(
    output: RemoveLiquidityQueryOutput,
): boolean {
    return (
        (output as RemoveLiquidityV2ComposableStableQueryOutput).bptIndex !==
        undefined
    );
}

export function getCheck(
    output: RemoveLiquidityQueryOutput,
    isExactIn: boolean,
) {
    if (isRemoveLiquidityV2ComposableStableQueryOutput(output)) {
        if (isExactIn) {
            // Using this destructuring to return only the fields of interest
            // biome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { amountsOut, bptIndex, ...check } =
                output as RemoveLiquidityV2ComposableStableQueryOutput;
            return check;
        }
        // biome-ignore lint/correctness/noUnusedVariables: <explanation>
        const { bptIn, bptIndex, ...check } =
            output as RemoveLiquidityV2ComposableStableQueryOutput;
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
        wethIsEth,
    } = txInput;

    const { removeLiquidityQueryOutput, removeLiquidityBuildCallOutput } =
        await sdkRemoveLiquidity({
            removeLiquidity,
            removeLiquidityInput,
            poolState,
            slippage,
            testAddress,
            wethIsEth,
        });

    // get tokens for balance change - pool tokens, BPT, native
    const tokens = getTokensForBalanceCheck(poolState);

    // send transaction and calculate balance changes
    const txOutput = await sendTransactionGetBalances(
        tokens,
        client,
        testAddress,
        removeLiquidityBuildCallOutput.to,
        removeLiquidityBuildCallOutput.call,
        removeLiquidityBuildCallOutput.value,
    );

    return {
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
        txOutput,
    };
}

export function assertRemoveLiquidityUnbalanced(
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquidityUnbalancedInput,
    removeLiquidityOutput: RemoveLiquidityOutput,
    slippage: Slippage,
    wethIsEth?: boolean,
) {
    const {
        txOutput,
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
    } = removeLiquidityOutput;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsOut = poolState.tokens.map((t) => {
        const token = new Token(
            removeLiquidityInput.chainId,
            t.address,
            t.decimals,
        );
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
        removeLiquidityKind: removeLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId: removeLiquidityInput.chainId,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, false);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect some bpt amount
    expect(removeLiquidityQueryOutput.bptIn.amount > 0n).to.be.true;

    assertRemoveLiquidityBuildCallOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
        false,
        slippage,
    );

    assertTokenDeltas(
        poolState,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
        wethIsEth,
    );
}

export function assertRemoveLiquiditySingleTokenExactOut(
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquiditySingleTokenExactOutInput,
    removeLiquidityOutput: RemoveLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    wethIsEth?: boolean,
) {
    const {
        txOutput,
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
    } = removeLiquidityOutput;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsOut = poolState.tokens.map((t) => {
        const token = new Token(
            removeLiquidityInput.chainId,
            t.address,
            t.decimals,
        );
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
        removeLiquidityKind: removeLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId: removeLiquidityInput.chainId,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, false);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect some bpt amount
    expect(removeLiquidityQueryOutput.bptIn.amount > 0n).to.be.true;

    assertRemoveLiquidityBuildCallOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
        false,
        slippage,
        vaultVersion,
    );

    assertTokenDeltas(
        poolState,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
        wethIsEth,
    );
}

export function assertRemoveLiquiditySingleTokenExactIn(
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquiditySingleTokenExactInInput,
    removeLiquidityOutput: RemoveLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    wethIsEth?: boolean,
) {
    const {
        txOutput,
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
    } = removeLiquidityOutput;

    if (removeLiquidityQueryOutput.tokenOutIndex === undefined)
        throw removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError;

    const bptToken = new Token(
        removeLiquidityInput.chainId,
        poolState.address,
        18,
    );

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
        removeLiquidityKind: removeLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId: removeLiquidityInput.chainId,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect only tokenOut to have amount > 0
    // (Note removeLiquidityQueryOutput also has value for bpt if pre-minted)
    removeLiquidityQueryOutput.amountsOut.forEach((a) => {
        if (
            vaultVersion === 2 &&
            wethIsEth &&
            a.token.address === zeroAddress
        ) {
            expect(a.amount > 0n).to.be.true;
        } else if (a.token.address === removeLiquidityInput.tokenOut) {
            expect(a.amount > 0n).to.be.true;
        } else {
            expect(a.amount).toEqual(0n);
        }
    });

    assertRemoveLiquidityBuildCallOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
        true,
        slippage,
        vaultVersion,
    );

    assertTokenDeltas(
        poolState,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
        wethIsEth,
    );
}

export function assertRemoveLiquidityProportional(
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquidityProportionalInput,
    removeLiquidityOutput: RemoveLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    wethIsEth?: boolean,
) {
    const {
        txOutput,
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
    } = removeLiquidityOutput;

    const bptToken = new Token(
        removeLiquidityInput.chainId,
        poolState.address,
        18,
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
        // Only expect tokenInIndex for AddLiquiditySingleToken
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        removeLiquidityKind: removeLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId: removeLiquidityInput.chainId,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect all assets in to have an amount > 0 apart from BPT if it exists
    removeLiquidityQueryOutput.amountsOut.forEach((a) => {
        if (a.token.address === poolState.address) expect(a.amount).toEqual(0n);
        else expect(a.amount > 0n).to.be.true;
    });

    if (wethIsEth) {
        expect(
            removeLiquidityQueryOutput.amountsOut.some((a) =>
                a.token.isSameAddress(
                    NATIVE_ASSETS[removeLiquidityQueryOutput.chainId].wrapped,
                ),
            ),
        ).to.be.true;
    }

    assertRemoveLiquidityBuildCallOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
        true,
        slippage,
        vaultVersion,
    );

    assertTokenDeltas(
        poolState,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
        wethIsEth,
    );
}

export function assertRemoveLiquidityRecovery(
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquidityRecoveryInput,
    removeLiquidityOutput: RemoveLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 2 | 3 = 2,
    wethIsEth?: boolean,
) {
    const {
        txOutput,
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
    } = removeLiquidityOutput;

    const bptToken = new Token(
        removeLiquidityInput.chainId,
        poolState.address,
        18,
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
        // Only expect tokenInIndex for AddLiquiditySingleToken
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        removeLiquidityKind: removeLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId: removeLiquidityInput.chainId,
    };

    const queryCheck = getCheck(removeLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect all assets in to have an amount > 0 apart from BPT if it exists
    removeLiquidityQueryOutput.amountsOut.forEach((a) => {
        if (a.token.address === poolState.address) expect(a.amount).toEqual(0n);
        else expect(a.amount > 0n).to.be.true;
    });

    if (wethIsEth) {
        expect(
            removeLiquidityQueryOutput.amountsOut.some((a) =>
                a.token.isSameAddress(
                    NATIVE_ASSETS[removeLiquidityQueryOutput.chainId].wrapped,
                ),
            ),
        ).to.be.true;
    }

    assertRemoveLiquidityBuildCallOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
        true,
        slippage,
        vaultVersion,
    );

    assertTokenDeltas(
        poolState,
        removeLiquidityInput,
        removeLiquidityQueryOutput,
        txOutput,
        wethIsEth,
    );
}

export function assertTokenDeltas(
    poolState: PoolState,
    removeLiquidityInput: RemoveLiquidityInput | RemoveLiquidityRecoveryInput,
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput,
    txOutput: TxOutput,
    wethIsEth?: boolean,
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
    if (wethIsEth) {
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
        expect(diff).to.be.lessThanOrEqual(5);
    });
}

export function assertRemoveLiquidityBuildCallOutput(
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput,
    RemoveLiquidityBuildCallOutput: RemoveLiquidityBuildCallOutput,
    isExactIn: boolean,
    slippage: Slippage,
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

    const to =
        vaultVersion === 2
            ? VAULT[removeLiquidityQueryOutput.chainId]
            : BALANCER_ROUTER[removeLiquidityQueryOutput.chainId];

    const expectedBuildOutput: Omit<RemoveLiquidityBuildCallOutput, 'call'> = {
        minAmountsOut,
        maxBptIn,
        to,
        value: 0n, // Value should always be 0 when removing liquidity
    };

    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { call, ...buildCheck } = RemoveLiquidityBuildCallOutput;
    expect(buildCheck).to.deep.eq(expectedBuildOutput);
}
