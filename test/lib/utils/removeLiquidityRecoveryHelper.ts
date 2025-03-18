import {
    BALANCER_ROUTER,
    ChainId,
    NATIVE_ASSETS,
    PoolState,
    RemoveLiquidityBaseBuildCallInput,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityQueryOutput,
    RemoveLiquidityRecoveryInput,
    RemoveLiquidityV3BuildCallInput,
    Slippage,
    Token,
    TokenAmount,
    VAULT_V2,
} from 'src';
import { getTokensForBalanceCheck } from './getTokensForBalanceCheck';
import { sendTransactionGetBalances } from './helper';
import { RemoveLiquidityRecoveryTxInput } from './types';
import {
    RemoveLiquidityV2BaseBuildCallInput,
    RemoveLiquidityV2BuildCallInput,
} from '@/entities/removeLiquidity/removeLiquidityV2/types';
import {
    RemoveLiquidityOutput,
    assertRemoveLiquidityBuildCallOutput,
    assertTokenDeltas,
    getCheck,
} from './removeLiquidityHelper';
import { Hex } from 'viem';

export const sdkRemoveLiquidityRecovery = async ({
    removeLiquidity,
    removeLiquidityRecoveryInput,
    poolState,
    slippage,
    testAddress,
    wethIsEth,
    toInternalBalance,
}: Omit<RemoveLiquidityRecoveryTxInput, 'client'>): Promise<{
    removeLiquidityBuildCallOutput: RemoveLiquidityBuildCallOutput;
    removeLiquidityQueryOutput: RemoveLiquidityQueryOutput;
}> => {
    const removeLiquidityQueryOutput = await removeLiquidity.query(
        removeLiquidityRecoveryInput,
        poolState,
    );

    let removeLiquidityBuildInput: RemoveLiquidityBaseBuildCallInput = {
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
    if (poolState.protocolVersion === 3) {
        (removeLiquidityBuildInput as RemoveLiquidityV3BuildCallInput) = {
            ...removeLiquidityBuildInput,
            userData: removeLiquidityRecoveryInput.userData ?? '0x',
        };
    }

    const removeLiquidityBuildCallOutput = removeLiquidity.buildCall(
        removeLiquidityBuildInput as
            | RemoveLiquidityV2BuildCallInput
            | RemoveLiquidityV3BuildCallInput,
    );

    return {
        removeLiquidityBuildCallOutput,
        removeLiquidityQueryOutput,
    };
};

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
export async function doRemoveLiquidityRecovery(
    txInput: RemoveLiquidityRecoveryTxInput,
) {
    const {
        removeLiquidity,
        poolState,
        removeLiquidityRecoveryInput,
        testAddress,
        client,
        slippage,
        wethIsEth,
    } = txInput;

    const { removeLiquidityQueryOutput, removeLiquidityBuildCallOutput } =
        await sdkRemoveLiquidityRecovery({
            removeLiquidity,
            removeLiquidityRecoveryInput,
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
        removeLiquidityBuildCallOutput.callData,
        removeLiquidityBuildCallOutput.value,
    );

    return {
        removeLiquidityQueryOutput,
        removeLiquidityBuildCallOutput,
        txOutput,
    };
}

export function assertRemoveLiquidityRecovery(
    poolState: PoolState,
    removeLiquidityRecoveryInput: RemoveLiquidityRecoveryInput,
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

    const bptToken = new Token(
        removeLiquidityRecoveryInput.chainId,
        poolState.address,
        18,
    );

    let expectedQueryOutput:
        | Omit<RemoveLiquidityQueryOutput, 'amountsOut' | 'bptIndex'>
        | (Omit<RemoveLiquidityQueryOutput, 'amountsOut' | 'bptIndex'> & {
              userData: Hex;
          }) = {
        // Query should use same bpt out as user sets
        bptIn: TokenAmount.fromRawAmount(
            bptToken,
            removeLiquidityRecoveryInput.bptIn.rawAmount,
        ),
        // Only expect tokenInIndex for AddLiquiditySingleToken
        tokenOutIndex: undefined,
        // Should match inputs
        poolId: poolState.id,
        poolType: poolState.type,
        removeLiquidityKind: removeLiquidityRecoveryInput.kind,
        protocolVersion: poolState.protocolVersion,
        chainId: removeLiquidityRecoveryInput.chainId,
        to:
            protocolVersion === 2
                ? VAULT_V2[chainId]
                : BALANCER_ROUTER[chainId],
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
        removeLiquidityRecoveryInput,
        removeLiquidityQueryOutput,
        txOutput,
        wethIsEth,
    );
}
