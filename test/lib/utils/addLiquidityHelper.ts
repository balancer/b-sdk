import {
    AddLiquidity,
    AddLiquidityBuildCallOutput,
    AddLiquidityBuildCallInput,
    AddLiquidityInput,
    AddLiquidityProportionalInput,
    AddLiquidityQueryOutput,
    AddLiquiditySingleTokenInput,
    addLiquiditySingleTokenShouldHaveTokenInIndexError,
    AddLiquidityUnbalancedInput,
    Address,
    BALANCER_ROUTER,
    NATIVE_ASSETS,
    PoolState,
    Slippage,
    Token,
    TokenAmount,
    VAULT,
    Permit2Helper,
} from 'src';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';
import { TxOutput, sendTransactionGetBalances } from './helper';
import { AddLiquidityTxInput } from './types';
import { AddLiquidityV2BaseBuildCallInput } from '@/entities/addLiquidity/addLiquidityV2/types';
import { AddLiquidityV2ComposableStableQueryOutput } from '@/entities/addLiquidity/addLiquidityV2/composableStable/types';

type AddLiquidityOutput = {
    addLiquidityQueryOutput: AddLiquidityQueryOutput;
    addLiquidityBuildCallOutput: AddLiquidityBuildCallOutput;
    txOutput: TxOutput;
};

async function sdkAddLiquidity({
    addLiquidity,
    addLiquidityInput,
    poolState,
    slippage,
    testAddress,
    wethIsEth,
    fromInternalBalance,
}: {
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    poolState: PoolState;
    slippage: Slippage;
    testAddress: Address;
    wethIsEth?: boolean;
    fromInternalBalance?: boolean;
}): Promise<{
    addLiquidityBuildCallOutput: AddLiquidityBuildCallOutput;
    addLiquidityQueryOutput: AddLiquidityQueryOutput;
}> {
    const addLiquidityQueryOutput = await addLiquidity.query(
        addLiquidityInput,
        poolState,
    );

    let addLiquidityBuildInput: AddLiquidityBuildCallInput = {
        ...addLiquidityQueryOutput,
        slippage,
        wethIsEth: !!wethIsEth,
    };
    if (poolState.vaultVersion === 2) {
        (addLiquidityBuildInput as AddLiquidityV2BaseBuildCallInput) = {
            ...addLiquidityBuildInput,
            sender: testAddress,
            recipient: testAddress,
            fromInternalBalance: !!fromInternalBalance,
        };
    }

    const addLiquidityBuildCallOutput = addLiquidity.buildCall(
        addLiquidityBuildInput,
    );

    return {
        addLiquidityBuildCallOutput,
        addLiquidityQueryOutput,
    };
}

async function sdkAddLiquidityWithPermit2({
    addLiquidity,
    addLiquidityInput,
    poolState,
    slippage,
    wethIsEth,
    client,
    testAddress,
}: AddLiquidityTxInput): Promise<{
    addLiquidityBuildCallOutput: AddLiquidityBuildCallOutput;
    addLiquidityQueryOutput: AddLiquidityQueryOutput;
}> {
    const addLiquidityQueryOutput = await addLiquidity.query(
        addLiquidityInput,
        poolState,
    );

    const addLiquidityBuildInput: AddLiquidityBuildCallInput = {
        ...addLiquidityQueryOutput,
        slippage,
        wethIsEth: !!wethIsEth,
    };

    const permit2 = await Permit2Helper.signAddLiquidityApproval({
        ...addLiquidityBuildInput,
        client,
        owner: testAddress,
    });

    const addLiquidityBuildCallOutput = addLiquidity.buildCallWithPermit2(
        addLiquidityBuildInput,
        permit2,
    );

    return {
        addLiquidityBuildCallOutput,
        addLiquidityQueryOutput,
    };
}

function isAddLiquidityComposableStableQueryOutput(
    output: AddLiquidityQueryOutput,
): boolean {
    if ('bptIndex' in output) return true;
    return false;
}

function getCheck(output: AddLiquidityQueryOutput, isExactIn: boolean) {
    if (isAddLiquidityComposableStableQueryOutput(output)) {
        if (isExactIn) {
            // Using this destructuring to return only the fields of interest
            // biome-ignore lint/correctness/noUnusedVariables: <explanation>
            const { bptOut, bptIndex, ...check } =
                output as AddLiquidityV2ComposableStableQueryOutput;
            return check;
        }
        // biome-ignore lint/correctness/noUnusedVariables: <explanation>
        const { amountsIn, bptIndex, ...check } =
            output as AddLiquidityV2ComposableStableQueryOutput;
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
        wethIsEth,
    } = txInput;

    const { addLiquidityQueryOutput, addLiquidityBuildCallOutput } =
        await sdkAddLiquidity({
            addLiquidity,
            addLiquidityInput,
            poolState,
            slippage,
            testAddress,
            wethIsEth,
        });

    const tokens = getTokensForBalanceCheck(poolState);

    // send transaction and calculate balance changes
    const txOutput = await sendTransactionGetBalances(
        tokens,
        client,
        testAddress,
        addLiquidityBuildCallOutput.to,
        addLiquidityBuildCallOutput.callData,
        addLiquidityBuildCallOutput.value,
    );

    return {
        addLiquidityQueryOutput,
        addLiquidityBuildCallOutput,
        txOutput,
    };
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
export async function doAddLiquidityWithPermit2(txInput: AddLiquidityTxInput) {
    const {
        addLiquidity,
        poolState,
        addLiquidityInput,
        testAddress,
        client,
        slippage,
        wethIsEth,
    } = txInput;

    const { addLiquidityQueryOutput, addLiquidityBuildCallOutput } =
        await sdkAddLiquidityWithPermit2({
            addLiquidity,
            addLiquidityInput,
            poolState,
            slippage,
            testAddress,
            wethIsEth,
            client,
        });

    const tokens = getTokensForBalanceCheck(poolState);

    // send transaction and calculate balance changes
    const txOutput = await sendTransactionGetBalances(
        tokens,
        client,
        testAddress,
        addLiquidityBuildCallOutput.to,
        addLiquidityBuildCallOutput.callData,
        addLiquidityBuildCallOutput.value,
    );

    return {
        addLiquidityQueryOutput,
        addLiquidityBuildCallOutput,
        txOutput,
    };
}

export function assertAddLiquidityUnbalanced(
    poolState: PoolState,
    addLiquidityInput: AddLiquidityUnbalancedInput,
    addLiquidityOutput: AddLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 0 | 2 | 3 = 2,
    wethIsEth?: boolean,
) {
    const { txOutput, addLiquidityQueryOutput, addLiquidityBuildCallOutput } =
        addLiquidityOutput;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsIn = poolState.tokens.map((t) => {
        const token = new Token(
            addLiquidityInput.chainId,
            t.address,
            t.decimals,
        );
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
        // | Omit<AddLiquidityV2BaseQueryOutput, 'amountsIn' | 'bptIndex'> = {
        // Query should use same amountsIn as input
        amountsIn: expectedAmountsIn,
        tokenInIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        addLiquidityKind: addLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId: addLiquidityInput.chainId,
    };

    const queryCheck = getCheck(addLiquidityQueryOutput, true);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect some bpt amount
    expect(addLiquidityQueryOutput.bptOut.amount > 0n).to.be.true;

    assertAddLiquidityBuildCallOutput(
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildCallOutput,
        true,
        slippage,
        vaultVersion,
        wethIsEth,
    );

    assertTokenDeltas(
        poolState,
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildCallOutput,
        txOutput,
        wethIsEth,
    );
}

export function assertAddLiquiditySingleToken(
    poolState: PoolState,
    addLiquidityInput: AddLiquiditySingleTokenInput,
    addLiquidityOutput: AddLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 0 | 2 | 3 = 2,
    wethIsEth?: boolean,
) {
    const { txOutput, addLiquidityQueryOutput, addLiquidityBuildCallOutput } =
        addLiquidityOutput;

    if (addLiquidityQueryOutput.tokenInIndex === undefined)
        throw addLiquiditySingleTokenShouldHaveTokenInIndexError;

    const bptToken = new Token(
        addLiquidityInput.chainId,
        poolState.address,
        18,
    );

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
        addLiquidityKind: addLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId: addLiquidityInput.chainId,
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

    assertAddLiquidityBuildCallOutput(
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildCallOutput,
        false,
        slippage,
        vaultVersion,
        wethIsEth,
    );

    assertTokenDeltas(
        poolState,
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildCallOutput,
        txOutput,
        wethIsEth,
    );
}

export function assertAddLiquidityProportional(
    poolState: PoolState,
    addLiquidityInput: AddLiquidityProportionalInput,
    addLiquidityOutput: AddLiquidityOutput,
    slippage: Slippage,
    vaultVersion: 0 | 2 | 3 = 2,
    wethIsEth?: boolean,
) {
    const { txOutput, addLiquidityQueryOutput, addLiquidityBuildCallOutput } =
        addLiquidityOutput;

    const bptToken = new Token(
        addLiquidityInput.chainId,
        poolState.address,
        18,
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
        // Only expect tokenInIndex for AddLiquiditySingleToken
        tokenInIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        addLiquidityKind: addLiquidityInput.kind,
        vaultVersion: poolState.vaultVersion,
        chainId: addLiquidityInput.chainId,
    };

    const queryCheck = getCheck(addLiquidityQueryOutput, false);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect all assets in to have an amount > 0 apart from BPT if it exists
    addLiquidityQueryOutput.amountsIn.forEach((a) => {
        if (a.token.address === poolState.address) expect(a.amount).toEqual(0n);
        else expect(a.amount > 0n).to.be.true;
    });

    assertAddLiquidityBuildCallOutput(
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildCallOutput,
        false,
        slippage,
        vaultVersion,
        wethIsEth,
    );

    if (wethIsEth) {
        expect(
            addLiquidityOutput.addLiquidityQueryOutput.amountsIn.some((t) =>
                t.token.isSameAddress(
                    NATIVE_ASSETS[addLiquidityInput.chainId].wrapped,
                ),
            ),
        ).to.be.true;
    }

    assertTokenDeltas(
        poolState,
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildCallOutput,
        txOutput,
        wethIsEth,
    );
}

function assertTokenDeltas(
    poolState: PoolState,
    addLiquidityInput: AddLiquidityInput,
    addLiquidityQueryOutput: AddLiquidityQueryOutput,
    addLiquidityBuildCallOutput: AddLiquidityBuildCallOutput,
    txOutput: TxOutput,
    wethIsEth?: boolean,
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
     * - Balancer V3: WETH address represents the native asset (in combination with wethIsEth flag)
     */
    if (wethIsEth) {
        const nativeAssetIndex = amountsWithoutBpt.findIndex((a) =>
            a.token.isSameAddress(
                NATIVE_ASSETS[addLiquidityInput.chainId].wrapped,
            ),
        );
        expectedDeltas[nativeAssetIndex] = 0n;
        expectedDeltas[expectedDeltas.length - 1] =
            addLiquidityBuildCallOutput.value;
    }

    expect(txOutput.balanceDeltas).to.deep.eq(expectedDeltas);
}

function assertAddLiquidityBuildCallOutput(
    addLiquidityInput: AddLiquidityInput,
    addLiquidityQueryOutput: AddLiquidityQueryOutput,
    addLiquidityBuildCallOutput: AddLiquidityBuildCallOutput,
    isExactIn: boolean,
    slippage: Slippage,
    vaultVersion: 0 | 2 | 3 = 2,
    wethIsEth?: boolean,
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

    let to: Address;
    switch (vaultVersion) {
        case 0:
            to = addLiquidityQueryOutput.poolId;
            break;
        case 2:
            to = VAULT[addLiquidityInput.chainId];
            break;
        case 3:
            to = BALANCER_ROUTER[addLiquidityInput.chainId];
            break;
    }

    let value = 0n;
    if (wethIsEth) {
        value =
            addLiquidityQueryOutput.amountsIn.find((a) =>
                a.token.isSameAddress(
                    NATIVE_ASSETS[addLiquidityInput.chainId].wrapped,
                ),
            )?.amount ?? 0n;
    }

    const expectedBuildOutput: Omit<AddLiquidityBuildCallOutput, 'callData'> = {
        maxAmountsIn,
        minBptOut,
        to,
        value,
    };

    // biome-ignore lint/correctness/noUnusedVariables: <explanation>
    const { callData, ...buildCheck } = addLiquidityBuildCallOutput;
    expect(buildCheck).to.deep.eq(expectedBuildOutput);
}
