import { Hex, zeroAddress } from 'viem';
import {
    Address,
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
    VAULT_V2,
    PermitHelper,
    ChainId,
} from 'src';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';
import { sendTransactionGetBalances, TxOutput } from './helper';
import { RemoveLiquidityTxInput } from './types';
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
    client,
    usePermitSignatures,
}: RemoveLiquidityTxInput): Promise<{
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
    if (poolState.protocolVersion === 2) {
        (removeLiquidityBuildInput as RemoveLiquidityV2BaseBuildCallInput) = {
            ...removeLiquidityBuildInput,
            sender: testAddress,
            recipient: testAddress,
            toInternalBalance: !!toInternalBalance,
        };
    }

    let removeLiquidityBuildCallOutput: RemoveLiquidityBuildCallOutput;
    if (usePermitSignatures) {
        const permit = await PermitHelper.signRemoveLiquidityApproval({
            ...removeLiquidityBuildInput,
            client,
            owner: testAddress,
        });

        removeLiquidityBuildCallOutput = removeLiquidity.buildCallWithPermit(
            removeLiquidityBuildInput,
            permit,
        );
    } else {
        removeLiquidityBuildCallOutput = removeLiquidity.buildCall(
            removeLiquidityBuildInput,
        );
    }

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
        usePermitSignatures,
    } = txInput;

    const { removeLiquidityQueryOutput, removeLiquidityBuildCallOutput } =
        await sdkRemoveLiquidity({
            removeLiquidity,
            removeLiquidityInput,
            poolState,
            slippage,
            testAddress,
            wethIsEth,
            client,
            usePermitSignatures,
        });

    // get tokens for balance change - pool tokens, BPT, native
    const tokens = getTokensForBalanceCheck(poolState);

    // send transaction and calculate balance changes
    const txOutput = await sendTransactionGetBalances(
        tokens,
        client,
        testAddress,
        removeLiquidityBuildCallOutput.to,
        removeLiquidityBuildCallOutput.callData,
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
    chainId: ChainId,
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
        to: VAULT_V2[chainId],
        amountsOut: expectedAmountsOut,
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        removeLiquidityKind: removeLiquidityInput.kind,
        protocolVersion: poolState.protocolVersion,
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
    chainId: ChainId,
    protocolVersion: 2 | 3 = 2,
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

    let expectedQueryOutput:
        | Omit<RemoveLiquidityQueryOutput, 'bptIn' | 'bptIndex'>
        | (Omit<RemoveLiquidityQueryOutput, 'amountsOut' | 'bptIndex'> & {
              userData: Hex;
          }) = {
        // Query should use same amountsOut as input
        to:
            protocolVersion === 2
                ? VAULT_V2[chainId]
                : BALANCER_ROUTER[chainId],
        amountsOut: expectedAmountsOut,
        tokenOutIndex: tokensWithoutBpt.findIndex(
            (t) => t.address === removeLiquidityInput.amountOut.address,
        ),
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        removeLiquidityKind: removeLiquidityInput.kind,
        protocolVersion: poolState.protocolVersion,
        chainId: removeLiquidityInput.chainId,
    };

    if (protocolVersion === 3)
        expectedQueryOutput = { ...expectedQueryOutput, userData: '0x' };

    const queryCheck = getCheck(removeLiquidityQueryOutput, false);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect some bpt amount
    expect(removeLiquidityQueryOutput.bptIn.amount > 0n).to.be.true;

    assertRemoveLiquidityBuildCallOutput(
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
        false,
        slippage,
        protocolVersion,
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
    chainId: ChainId,
    protocolVersion: 2 | 3 = 2,
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

    let expectedQueryOutput:
        | Omit<RemoveLiquidityQueryOutput, 'amountsOut' | 'bptIndex'>
        | (Omit<RemoveLiquidityQueryOutput, 'amountsOut' | 'bptIndex'> & {
              userData: Hex;
          }) = {
        // Query should use same bpt out as user sets
        to:
            protocolVersion === 2
                ? VAULT_V2[chainId]
                : BALANCER_ROUTER[chainId],
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
        protocolVersion: poolState.protocolVersion,
        chainId: removeLiquidityInput.chainId,
    };

    if (protocolVersion === 3)
        expectedQueryOutput = { ...expectedQueryOutput, userData: '0x' };

    const queryCheck = getCheck(removeLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect only tokenOut to have amount > 0
    // (Note removeLiquidityQueryOutput also has value for bpt if pre-minted)
    removeLiquidityQueryOutput.amountsOut.forEach((a) => {
        if (
            protocolVersion === 2 &&
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
        protocolVersion,
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
    chainId: ChainId,
    protocolVersion: 1 | 2 | 3 = 2,
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

    let to: Address;

    switch (protocolVersion) {
        case 1:
            to = poolState.address;
            break;
        case 2:
            to = VAULT_V2[chainId];
            break;
        case 3:
            to = BALANCER_ROUTER[chainId];
            break;
        default:
            throw new Error(`Unsupported protocolVersion: ${protocolVersion}`);
    }

    let expectedQueryOutput:
        | Omit<RemoveLiquidityQueryOutput, 'amountsOut' | 'bptIndex'>
        | (Omit<RemoveLiquidityQueryOutput, 'amountsOut' | 'bptIndex'> & {
              userData: Hex;
          }) = {
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
        protocolVersion: poolState.protocolVersion,
        chainId: removeLiquidityInput.chainId,
        to,
    };

    if (protocolVersion === 3)
        expectedQueryOutput = { ...expectedQueryOutput, userData: '0x' };

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
        protocolVersion,
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

    expect(txOutput.balanceDeltas).to.deep.eq(expectedDeltas);
}

export function assertRemoveLiquidityBuildCallOutput(
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput,
    RemoveLiquidityBuildCallOutput: RemoveLiquidityBuildCallOutput,
    isExactIn: boolean,
    slippage: Slippage,
    protocolVersion: 1 | 2 | 3 = 2,
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

    let to: Address;
    switch (protocolVersion) {
        case 1:
            to = removeLiquidityQueryOutput.poolId;
            break;
        case 2:
            to = VAULT_V2[removeLiquidityQueryOutput.chainId];
            break;
        case 3:
            to = BALANCER_ROUTER[removeLiquidityQueryOutput.chainId];
            break;
    }

    const expectedBuildOutput: Omit<
        RemoveLiquidityBuildCallOutput,
        'callData'
    > = {
        minAmountsOut,
        maxBptIn,
        to,
        value: 0n, // Value should always be 0 when removing liquidity
    };

    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { callData, ...buildCheck } = RemoveLiquidityBuildCallOutput;
    expect(buildCheck).to.deep.eq(expectedBuildOutput);
}
