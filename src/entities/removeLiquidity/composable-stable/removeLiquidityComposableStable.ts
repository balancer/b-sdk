import { encodeFunctionData } from 'viem';
import { Token } from '../../token';
import { TokenAmount } from '../../tokenAmount';
import { Address } from '../../../types';
import {
    BALANCER_VAULT,
    MAX_UINT256,
    ZERO_ADDRESS,
} from '../../../utils/constants';
import { vaultAbi } from '../../../abi';
import { parseRemoveLiquidityArgs } from '../../utils/parseRemoveLiquidityArgs';
import {
    RemoveLiquidityBase,
    RemoveLiquidityComposableStableCall,
    RemoveLiquidityBuildOutput,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityQueryOutput,
} from '../types';
import { RemoveLiquidityAmounts, PoolState } from '../../types';
import { doRemoveLiquidity } from '../../utils/doRemoveLiquidity';
import { ComposableStableEncoder } from '../../encoders/composableStable';
import { getAmounts } from '../../utils';

export class RemoveLiquidityComposableStable implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        const bptIndex = poolState.tokens.findIndex(
            (t) => t.address === poolState.address,
        );
        const amounts = this.getAmountsQuery(poolState.tokens, input, bptIndex);
        const amountsWithoutBpt = {
            ...amounts,
            minAmountsOut: [
                ...amounts.minAmountsOut.slice(0, bptIndex),
                ...amounts.minAmountsOut.slice(bptIndex + 1),
            ],
        };
        const userData = this.encodeUserData(input.kind, amountsWithoutBpt);

        // tokensOut will have zero address if exit with native asset
        const { args, tokensOut } = parseRemoveLiquidityArgs({
            chainId: input.chainId,
            exitWithNativeAsset: !!input.exitWithNativeAsset,
            poolId: poolState.id,
            sortedTokens: poolState.tokens,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            minAmountsOut: amounts.minAmountsOut,
            userData,
            toInternalBalance: !!input.toInternalBalance,
        });
        const queryOutput = await doRemoveLiquidity(
            input.rpcUrl,
            input.chainId,
            args,
        );
        const bpt = new Token(input.chainId, poolState.address, 18);
        const bptIn = TokenAmount.fromRawAmount(bpt, queryOutput.bptIn);

        const amountsOut = queryOutput.amountsOut.map((a, i) =>
            TokenAmount.fromRawAmount(tokensOut[i], a),
        );

        return {
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex: amounts.tokenOutIndex,
            toInternalBalance: !!input.toInternalBalance,
            bptIndex,
        };
    }

    private getAmountsQuery(
        tokens: Token[],
        input: RemoveLiquidityInput,
        bptIndex: number,
    ): RemoveLiquidityAmounts {
        switch (input.kind) {
            case RemoveLiquidityKind.Unbalanced:
                return {
                    minAmountsOut: getAmounts(tokens, input.amountsOut),
                    tokenOutIndex: undefined,
                    maxBptAmountIn: MAX_UINT256,
                };
            case RemoveLiquidityKind.SingleAsset:
                return {
                    minAmountsOut: Array(tokens.length).fill(0n),
                    tokenOutIndex: tokens
                        .filter((_, index) => index !== bptIndex)
                        .findIndex((t) => t.isSameAddress(input.tokenOut)),
                    maxBptAmountIn: input.bptIn.rawAmount,
                };
            case RemoveLiquidityKind.Proportional:
                return {
                    minAmountsOut: Array(tokens.length).fill(0n),
                    tokenOutIndex: undefined,
                    maxBptAmountIn: input.bptIn.rawAmount,
                };
        }
    }

    public buildCall(
        input: RemoveLiquidityComposableStableCall,
    ): RemoveLiquidityBuildOutput {
        const amounts = this.getAmountsCall(input);
        const amountsWithoutBpt = {
            ...amounts,
            minAmountsOut: [
                ...amounts.minAmountsOut.slice(0, input.bptIndex),
                ...amounts.minAmountsOut.slice(input.bptIndex + 1),
            ],
        };
        const userData = this.encodeUserData(
            input.removeLiquidityKind,
            amountsWithoutBpt,
        );

        const { args } = parseRemoveLiquidityArgs({
            poolId: input.poolId,
            sortedTokens: input.amountsOut.map((a) => a.token),
            sender: input.sender,
            recipient: input.recipient,
            minAmountsOut: amounts.minAmountsOut,
            userData,
            toInternalBalance: !!input.toInternalBalance,
        });
        const call = encodeFunctionData({
            abi: vaultAbi,
            functionName: 'exitPool',
            args,
        });

        return {
            call,
            to: BALANCER_VAULT,
            value: 0n,
            maxBptIn: TokenAmount.fromRawAmount(
                input.bptIn.token,
                amounts.maxBptAmountIn,
            ),
            minAmountsOut: input.amountsOut.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.minAmountsOut[i]),
            ),
        };
    }

    private getAmountsCall(
        input: RemoveLiquidityComposableStableCall,
    ): RemoveLiquidityAmounts {
        switch (input.removeLiquidityKind) {
            case RemoveLiquidityKind.Unbalanced:
                return {
                    minAmountsOut: input.amountsOut.map((a) => a.amount),
                    tokenOutIndex: input.tokenOutIndex,
                    maxBptAmountIn: input.slippage.applyTo(input.bptIn.amount),
                };
            case RemoveLiquidityKind.SingleAsset:
                if (input.tokenOutIndex === undefined) {
                    throw new Error(
                        'tokenOutIndex must be defined for SingleAsset exit',
                    );
                }
                return {
                    minAmountsOut: input.amountsOut.map((a) =>
                        input.slippage.removeFrom(a.amount),
                    ),
                    tokenOutIndex: input.tokenOutIndex,
                    maxBptAmountIn: input.bptIn.amount,
                };
            case RemoveLiquidityKind.Proportional:
                return {
                    minAmountsOut: input.amountsOut.map((a) =>
                        input.slippage.removeFrom(a.amount),
                    ),
                    tokenOutIndex: input.tokenOutIndex,
                    maxBptAmountIn: input.bptIn.amount,
                };
            default:
                throw Error('Unsupported Remove Liquidity Kind');
        }
    }

    private encodeUserData(
        kind: RemoveLiquidityKind,
        amounts: RemoveLiquidityAmounts,
    ): Address {
        switch (kind) {
            case RemoveLiquidityKind.Unbalanced:
                return ComposableStableEncoder.removeLiquidityUnbalanced(
                    amounts.minAmountsOut,
                    amounts.maxBptAmountIn,
                );
            case RemoveLiquidityKind.SingleAsset:
                if (amounts.tokenOutIndex === undefined)
                    throw Error('No Index');

                return ComposableStableEncoder.removeLiquiditySingleToken(
                    amounts.maxBptAmountIn,
                    amounts.tokenOutIndex,
                );
            case RemoveLiquidityKind.Proportional:
                return ComposableStableEncoder.removeLiquidityProportional(
                    amounts.maxBptAmountIn,
                );
            default:
                throw Error('Unsupported Remove Liquidity Kind');
        }
    }
}
