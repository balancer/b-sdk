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
    AddLiquidityKind,
    ChainId,
    isSameAddress,
} from 'src';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';
import { TxOutput, sendTransactionGetBalances } from './helper';
import { AddLiquidityTxInput } from './types';
import { AddLiquidityV2BaseBuildCallInput } from '@/entities/addLiquidity/addLiquidityV2/types';
import { AddLiquidityV2ComposableStableQueryOutput } from '@/entities/addLiquidity/addLiquidityV2/composableStable/types';
import { Client, Hex, PublicActions, WalletActions } from 'viem';

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
    client,
    usePermit2Signatures,
}: {
    addLiquidity: AddLiquidity;
    addLiquidityInput: AddLiquidityInput;
    poolState: PoolState;
    slippage: Slippage;
    testAddress: Address;
    wethIsEth?: boolean;
    fromInternalBalance?: boolean;
    client: Client & PublicActions & WalletActions;
    usePermit2Signatures?: boolean;
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
    if (poolState.protocolVersion === 2) {
        (addLiquidityBuildInput as AddLiquidityV2BaseBuildCallInput) = {
            ...addLiquidityBuildInput,
            sender: testAddress,
            recipient: testAddress,
            fromInternalBalance: !!fromInternalBalance,
        };
    }

    let addLiquidityBuildCallOutput: AddLiquidityBuildCallOutput;

    if (usePermit2Signatures) {
        const permit2 = await Permit2Helper.signAddLiquidityApproval({
            ...addLiquidityBuildInput,
            client,
            owner: testAddress,
        });

        addLiquidityBuildCallOutput = addLiquidity.buildCallWithPermit2(
            addLiquidityBuildInput,
            permit2,
        );
    } else {
        addLiquidityBuildCallOutput = addLiquidity.buildCall(
            addLiquidityBuildInput,
        );
    }

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

function getCheck(output: AddLiquidityQueryOutput) {
    let _check = output;
    // biome-ignore lint/correctness/noUnusedVariables: <bptIndex may not exist depending on the pool type>
    let bptIndex: number | undefined;
    // remove bptIndex from check
    if (isAddLiquidityComposableStableQueryOutput(output)) {
        ({ bptIndex, ..._check } =
            output as AddLiquidityV2ComposableStableQueryOutput);
    }
    // remove bptOut and amountsIn from check
    const { bptOut, amountsIn, ...check } = _check;

    const kind = output.addLiquidityKind;
    switch (kind) {
        case AddLiquidityKind.Proportional:
            return { ...check };
        case AddLiquidityKind.SingleToken:
            return { ...check, bptOut };
        case AddLiquidityKind.Unbalanced:
            return { ...check, amountsIn };
    }
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
        usePermit2Signatures,
    } = txInput;

    const { addLiquidityQueryOutput, addLiquidityBuildCallOutput } =
        await sdkAddLiquidity({
            addLiquidity,
            addLiquidityInput,
            poolState,
            slippage,
            testAddress,
            wethIsEth,
            usePermit2Signatures,
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
    chainId: ChainId,
    protocolVersion: 2 | 3 = 2,
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

    let expectedQueryOutput:
        | Omit<AddLiquidityQueryOutput, 'bptOut' | 'bptIndex'>
        | (Omit<AddLiquidityQueryOutput, 'bptOut' | 'bptIndex'> & {
              userData: Hex;
          }) = {
        // | Omit<AddLiquidityV2BaseQueryOutput, 'amountsIn' | 'bptIndex'> = {
        // Query should use same amountsIn as input
        to: protocolVersion === 2 ? VAULT[chainId] : BALANCER_ROUTER[chainId],
        amountsIn: expectedAmountsIn,
        tokenInIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        addLiquidityKind: addLiquidityInput.kind,
        protocolVersion: poolState.protocolVersion,
        chainId: addLiquidityInput.chainId,
    };

    if (protocolVersion === 3)
        expectedQueryOutput = { ...expectedQueryOutput, userData: '0x' };

    const queryCheck = getCheck(addLiquidityQueryOutput);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect some bpt amount
    expect(addLiquidityQueryOutput.bptOut.amount > 0n).to.be.true;

    assertAddLiquidityBuildCallOutput(
        addLiquidityInput,
        addLiquidityQueryOutput,
        addLiquidityBuildCallOutput,
        true,
        slippage,
        protocolVersion,
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
    chainId: ChainId,
    protocolVersion: 2 | 3 = 2,
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

    let expectedQueryOutput:
        | Omit<AddLiquidityQueryOutput, 'amountsIn' | 'bptIndex'>
        | (Omit<AddLiquidityQueryOutput, 'bptOut' | 'bptIndex'> & {
              userData: Hex;
          }) = {
        // Query should use same bpt out as user sets
        to: protocolVersion === 2 ? VAULT[chainId] : BALANCER_ROUTER[chainId],
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
        protocolVersion: poolState.protocolVersion,
        chainId: addLiquidityInput.chainId,
    };

    if (protocolVersion === 3)
        expectedQueryOutput = { ...expectedQueryOutput, userData: '0x' };

    const queryCheck = getCheck(addLiquidityQueryOutput);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    // Expect only tokenIn to have amount > 0
    // (Note addLiquidityQueryOutput also has value for bpt if pre-minted)
    addLiquidityQueryOutput.amountsIn.forEach((a) => {
        if (isSameAddress(a.token.address, addLiquidityInput.tokenIn)) {
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
        protocolVersion,
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
    chainId: ChainId,
    protocolVersion: 1 | 2 | 3 = 2,
    wethIsEth?: boolean,
) {
    const { txOutput, addLiquidityQueryOutput, addLiquidityBuildCallOutput } =
        addLiquidityOutput;

    let to: Address;

    switch (protocolVersion) {
        case 1:
            to = poolState.address;
            break;
        case 2:
            to = VAULT[chainId];
            break;
        case 3:
            to = BALANCER_ROUTER[chainId];
            break;
        default:
            throw new Error(`Unsupported protocolVersion: ${protocolVersion}`);
    }

    let expectedQueryOutput: Omit<
        AddLiquidityQueryOutput,
        'bptOut' | 'bptIndex' | 'amountsIn'
    > & {
        userData?: Hex;
    } = {
        to,
        // Only expect tokenInIndex for AddLiquiditySingleToken
        tokenInIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        addLiquidityKind: addLiquidityInput.kind,
        protocolVersion: poolState.protocolVersion,
        chainId: addLiquidityInput.chainId,
    };

    if (protocolVersion === 3)
        expectedQueryOutput = { ...expectedQueryOutput, userData: '0x' };

    const queryCheck = getCheck(addLiquidityQueryOutput);

    expect(queryCheck).to.deep.eq(expectedQueryOutput);

    if (
        addLiquidityQueryOutput.bptOut.token.isSameAddress(
            addLiquidityInput.referenceAmount.address,
        )
    ) {
        // referenceAmount as bptOut - queryOutput should be an exact match with user provided input
        expect(addLiquidityQueryOutput.bptOut.amount).toEqual(
            addLiquidityInput.referenceAmount.rawAmount,
        );
    } else {
        // referenceAmount as amountsIn - queryOutput can be 1 wei diff from user provided amount
        addLiquidityQueryOutput.amountsIn.forEach((a) => {
            if (
                a.token.isSameAddress(addLiquidityInput.referenceAmount.address)
            )
                expect(
                    Number(
                        a.amount - addLiquidityInput.referenceAmount.rawAmount,
                    ),
                ).closeTo(0, 1000); // 1000 wei tolerance
        });
    }

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
        protocolVersion,
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
    protocolVersion: 1 | 2 | 3 = 2,
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
    switch (protocolVersion) {
        case 1:
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
