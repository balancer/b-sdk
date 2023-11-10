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
import { parseExitArgs } from '../../utils/parseExitArgs';
import {
    BaseExit,
    ComposableStableExitCall,
    ExitBuildOutput,
    ExitInput,
    ExitKind,
    ExitQueryResult,
} from '../types';
import { AmountsExit, PoolState } from '../../types';
import { doQueryExit } from '../../utils/doQueryExit';
import { ComposableStableEncoder } from '../../encoders/composableStable';
import { getAmounts } from '../../utils';

export class ComposableStableExit implements BaseExit {
    public async query(
        input: ExitInput,
        poolState: PoolState,
    ): Promise<ExitQueryResult> {
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
        const { args, tokensOut } = parseExitArgs({
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
        const queryResult = await doQueryExit(
            input.rpcUrl,
            input.chainId,
            args,
        );
        const bpt = new Token(input.chainId, poolState.address, 18);
        const bptIn = TokenAmount.fromRawAmount(bpt, queryResult.bptIn);

        const amountsOut = queryResult.amountsOut.map((a, i) =>
            TokenAmount.fromRawAmount(tokensOut[i], a),
        );

        return {
            poolType: poolState.type,
            exitKind: input.kind,
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
        input: ExitInput,
        bptIndex: number,
    ): AmountsExit {
        switch (input.kind) {
            case ExitKind.Unbalanced:
                return {
                    minAmountsOut: getAmounts(tokens, input.amountsOut),
                    tokenOutIndex: undefined,
                    maxBptAmountIn: MAX_UINT256,
                };
            case ExitKind.SingleAsset:
                return {
                    minAmountsOut: Array(tokens.length).fill(0n),
                    tokenOutIndex: tokens
                        .filter((_, index) => index !== bptIndex)
                        .findIndex((t) => t.isSameAddress(input.tokenOut)),
                    maxBptAmountIn: input.bptIn.rawAmount,
                };
            case ExitKind.Proportional:
                return {
                    minAmountsOut: Array(tokens.length).fill(0n),
                    tokenOutIndex: undefined,
                    maxBptAmountIn: input.bptIn.rawAmount,
                };
        }
    }

    public buildCall(input: ComposableStableExitCall): ExitBuildOutput {
        const amounts = this.getAmountsCall(input);
        const amountsWithoutBpt = {
            ...amounts,
            minAmountsOut: [
                ...amounts.minAmountsOut.slice(0, input.bptIndex),
                ...amounts.minAmountsOut.slice(input.bptIndex + 1),
            ],
        };
        const userData = this.encodeUserData(input.exitKind, amountsWithoutBpt);

        const { args } = parseExitArgs({
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

    private getAmountsCall(input: ComposableStableExitCall): AmountsExit {
        switch (input.exitKind) {
            case ExitKind.Unbalanced:
                return {
                    minAmountsOut: input.amountsOut.map((a) => a.amount),
                    tokenOutIndex: input.tokenOutIndex,
                    maxBptAmountIn: input.slippage.applyTo(input.bptIn.amount),
                };
            case ExitKind.SingleAsset:
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
            case ExitKind.Proportional:
                return {
                    minAmountsOut: input.amountsOut.map((a) =>
                        input.slippage.removeFrom(a.amount),
                    ),
                    tokenOutIndex: input.tokenOutIndex,
                    maxBptAmountIn: input.bptIn.amount,
                };
            default:
                throw Error('Unsupported Exit Type');
        }
    }

    private encodeUserData(kind: ExitKind, amounts: AmountsExit): Address {
        switch (kind) {
            case ExitKind.Unbalanced:
                return ComposableStableEncoder.exitUnbalanced(
                    amounts.minAmountsOut,
                    amounts.maxBptAmountIn,
                );
            case ExitKind.SingleAsset:
                if (amounts.tokenOutIndex === undefined)
                    throw Error('No Index');

                return ComposableStableEncoder.exitSingleAsset(
                    amounts.maxBptAmountIn,
                    amounts.tokenOutIndex,
                );
            case ExitKind.Proportional:
                return ComposableStableEncoder.exitProportional(
                    amounts.maxBptAmountIn,
                );
            default:
                throw Error('Unsupported Exit Type');
        }
    }
}
