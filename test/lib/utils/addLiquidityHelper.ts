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
import { zeroAddress } from 'viem';
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
}: {
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    poolState: PoolState;
    slippage: Slippage;
    testAddress: Address;
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
        wethIsEth: addLiquidityInput.useNativeAssetAsWrappedAmountIn ?? false,
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
    } = txInput;

    const { addLiquidityQueryOutput, addLiquidityBuildOutput } =
        await sdkAddLiquidity({
            addLiquidity,
            addLiquidityInput,
            poolState,
            slippage,
            testAddress,
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
    balancerVersion: 2 | 3 = 2,
) {
    const { txOutput, addLiquidityQueryOutput, addLiquidityBuildOutput } =
        addLiquidityOutput;

    // Get an amount for each pool token defaulting to 0 if not provided as input (this will include BPT token if in tokenList)
    const expectedAmountsIn = poolState.tokens.map((t) => {
        let token: Token;
        if (
            addLiquidityInput.useNativeAssetAsWrappedAmountIn &&
            t.address === NATIVE_ASSETS[chainId].wrapped &&
            balancerVersion === 2
        )
            token = new Token(chainId, zeroAddress, t.decimals);
        else token = new Token(chainId, t.address, t.decimals);
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
        balancerVersion: poolState.balancerVersion,
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
        balancerVersion,
    );

    assertTokenDeltas(
        poolState,
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildOutput,
        txOutput,
        balancerVersion,
    );
}

export function assertAddLiquiditySingleToken(
    chainId: ChainId,
    poolState: PoolState,
    addLiquidityInput: AddLiquiditySingleTokenInput,
    addLiquidityOutput: AddLiquidityOutput,
    slippage: Slippage,
    balancerVersion: 2 | 3 = 2,
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
        balancerVersion: poolState.balancerVersion,
    };

    const queryCheck = getCheck(addLiquidityQueryOutput, false);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect only tokenIn to have amount > 0
    // (Note addLiquidityQueryOutput also has value for bpt if pre-minted)
    addLiquidityQueryOutput.amountsIn.forEach((a) => {
        if (
            balancerVersion === 2 &&
            addLiquidityInput.useNativeAssetAsWrappedAmountIn &&
            a.token.address === zeroAddress
        ) {
            expect(a.amount > 0n).to.be.true;
        } else if (a.token.address === addLiquidityInput.tokenIn) {
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
        balancerVersion,
    );

    assertTokenDeltas(
        poolState,
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildOutput,
        txOutput,
        balancerVersion,
    );
}

export function assertAddLiquidityProportional(
    chainId: ChainId,
    poolState: PoolState,
    addLiquidityInput: AddLiquidityProportionalInput,
    addLiquidityOutput: AddLiquidityOutput,
    slippage: Slippage,
    balancerVersion: 2 | 3 = 2,
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
        balancerVersion: poolState.balancerVersion,
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
        balancerVersion,
    );

    assertTokenDeltas(
        poolState,
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildOutput,
        txOutput,
        balancerVersion,
    );
}

function assertTokenDeltas(
    poolState: PoolState,
    addLiquidityInput: AddLiquidityInput,
    addLiquidityQueryOutput: AddLiquidityQueryOutput,
    addLiquidityBuildOutput: AddLiquidityBuildOutput,
    txOutput: TxOutput,
    balancerVersion: 2 | 3 = 2,
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
    if (addLiquidityInput.useNativeAssetAsWrappedAmountIn) {
        const respectiveNativeAddress =
            balancerVersion === 2
                ? zeroAddress
                : NATIVE_ASSETS[addLiquidityInput.chainId].wrapped;
        const nativeAssetIndex = amountsWithoutBpt.findIndex(
            (a) => a.token.address === respectiveNativeAddress,
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
    balancerVersion: 2 | 3 = 2,
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
        balancerVersion === 2
            ? VAULT[addLiquidityInput.chainId]
            : BALANCER_ROUTER[addLiquidityInput.chainId];

    let value = 0n;
    if (addLiquidityInput.useNativeAssetAsWrappedAmountIn) {
        // v2 uses zero address for native asset, while v3 uses wethIsEth flag only
        const nativeAsset =
            balancerVersion === 2
                ? zeroAddress
                : NATIVE_ASSETS[addLiquidityInput.chainId].wrapped;
        value =
            addLiquidityQueryOutput.amountsIn.find(
                (a) => a.token.address === nativeAsset,
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
