import { encodeFunctionData } from 'viem';
import { Token } from '../../../token';
import { TokenAmount } from '../../../tokenAmount';
import { VAULT, MAX_UINT256, ZERO_ADDRESS } from '../../../../utils/constants';
import { vaultV2Abi } from '../../../../abi';
import { parseRemoveLiquidityArgs } from '../../../utils/parseRemoveLiquidityArgs';
import {
    RemoveLiquidityBase,
    RemoveLiquidityComposableStableCall,
    RemoveLiquidityBuildOutput,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityQueryOutput,
} from '../../types';
import { RemoveLiquidityAmounts, PoolState } from '../../../types';
import { doRemoveLiquidityQuery } from '../../../utils/doRemoveLiquidityQuery';
import { ComposableStableEncoder } from '../../../encoders/composableStable';
import { getAmounts, getSortedTokens } from '../../../utils';
import { removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError } from '@/utils';

export class RemoveLiquidityComposableStable implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const bptIndex = poolState.tokens.findIndex(
            (t) => t.address === poolState.address,
        );
        const amounts = this.getAmountsQuery(sortedTokens, input, bptIndex);
        const amountsWithoutBpt = {
            ...amounts,
            minAmountsOut: [
                ...amounts.minAmountsOut.slice(0, bptIndex),
                ...amounts.minAmountsOut.slice(bptIndex + 1),
            ],
        };
        const userData = ComposableStableEncoder.encodeRemoveLiquidityUserData(
            input.kind === RemoveLiquidityKind.Recovery
                ? RemoveLiquidityKind.Proportional
                : input.kind,
            amountsWithoutBpt,
        );

        // tokensOut will have zero address if removing liquidity to native asset
        const { args, tokensOut } = parseRemoveLiquidityArgs({
            chainId: input.chainId,
            poolId: poolState.id,
            sortedTokens,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            minAmountsOut: amounts.minAmountsOut,
            userData,
            toInternalBalance: !!input.toInternalBalance,
        });
        const queryOutput = await doRemoveLiquidityQuery(
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
            vaultVersion: poolState.vaultVersion,
            chainId: input.chainId,
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
            case RemoveLiquidityKind.SingleTokenExactOut:
                return {
                    minAmountsOut: getAmounts(tokens, [input.amountOut]),
                    tokenOutIndex: tokens
                        .filter((_, index) => index !== bptIndex)
                        .findIndex((t) =>
                            t.isSameAddress(input.amountOut.address),
                        ),
                    maxBptAmountIn: MAX_UINT256,
                };
            case RemoveLiquidityKind.SingleTokenExactIn:
                return {
                    minAmountsOut: Array(tokens.length).fill(0n),
                    tokenOutIndex: tokens
                        .filter((_, index) => index !== bptIndex)
                        .findIndex((t) => t.isSameAddress(input.tokenOut)),
                    maxBptAmountIn: input.bptIn.rawAmount,
                };
            case RemoveLiquidityKind.Recovery:
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
        const userData = ComposableStableEncoder.encodeRemoveLiquidityUserData(
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
            receiveNativeAsset: !!input.receiveNativeAsset,
            chainId: input.chainId,
        });
        const call = encodeFunctionData({
            abi: vaultV2Abi,
            functionName: 'exitPool',
            args,
        });

        return {
            call,
            to: VAULT[input.chainId],
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
            case RemoveLiquidityKind.SingleTokenExactOut:
                return {
                    minAmountsOut: input.amountsOut.map((a) => a.amount),
                    tokenOutIndex: input.tokenOutIndex,
                    maxBptAmountIn: input.slippage.applyTo(input.bptIn.amount),
                };
            case RemoveLiquidityKind.SingleTokenExactIn:
                if (input.tokenOutIndex === undefined) {
                    throw removeLiquiditySingleTokenExactInShouldHaveTokenOutIndexError;
                }
                return {
                    minAmountsOut: input.amountsOut.map((a) =>
                        input.slippage.applyTo(a.amount, -1),
                    ),
                    tokenOutIndex: input.tokenOutIndex,
                    maxBptAmountIn: input.bptIn.amount,
                };
            case RemoveLiquidityKind.Recovery:
            case RemoveLiquidityKind.Proportional:
                return {
                    minAmountsOut: input.amountsOut.map((a) =>
                        input.slippage.applyTo(a.amount, -1),
                    ),
                    tokenOutIndex: input.tokenOutIndex,
                    maxBptAmountIn: input.bptIn.amount,
                };
        }
    }
}
