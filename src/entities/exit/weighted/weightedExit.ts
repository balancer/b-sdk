import { encodeFunctionData } from 'viem';
import { Token } from '../../token';
import { TokenAmount } from '../../tokenAmount';
import { WeightedEncoder } from '../../encoders/weighted';
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
    ExitBuildOutput,
    ExitCallInput,
    ExitInput,
    ExitKind,
    ExitQueryResult,
} from '../types';
import { AmountsExit, PoolState } from '../../types';
import { doQueryExit } from '../../utils/doQueryExit';

export class WeightedExit implements BaseExit {
    public async query(
        input: ExitInput,
        poolState: PoolState,
    ): Promise<ExitQueryResult> {
        const amounts = this.getAmountsQuery(poolState.tokens, input);

        const userData = this.encodeUserData(input.kind, amounts);

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
            id: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex: amounts.tokenOutIndex,
        };
    }

    private getAmountsQuery(tokens: Token[], input: ExitInput): AmountsExit {
        switch (input.kind) {
            case ExitKind.UNBALANCED:
                return {
                    minAmountsOut: tokens.map(
                        (t) =>
                            input.amountsOut.find((a) => a.token.isEqual(t))
                                ?.amount ?? 0n,
                    ),
                    tokenOutIndex: undefined,
                    maxBptAmountIn: MAX_UINT256,
                };
            case ExitKind.SINGLE_ASSET:
                return {
                    minAmountsOut: Array(tokens.length).fill(0n),
                    tokenOutIndex: tokens.findIndex((t) =>
                        t.isSameAddress(input.tokenOut),
                    ),
                    maxBptAmountIn: input.bptIn.amount,
                };
            case ExitKind.PROPORTIONAL:
                return {
                    minAmountsOut: Array(tokens.length).fill(0n),
                    tokenOutIndex: undefined,
                    maxBptAmountIn: input.bptIn.amount,
                };
        }
    }

    public buildCall(input: ExitCallInput): ExitBuildOutput {
        const amounts = this.getAmountsCall(input);

        const userData = this.encodeUserData(input.exitKind, amounts);

        const { args } = parseExitArgs({
            poolId: input.id,
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
            maxBptIn: amounts.maxBptAmountIn,
            minAmountsOut: amounts.minAmountsOut,
        };
    }

    private getAmountsCall(input: ExitCallInput): AmountsExit {
        switch (input.exitKind) {
            case ExitKind.UNBALANCED:
                return {
                    minAmountsOut: input.amountsOut.map((a) => a.amount),
                    tokenOutIndex: input.tokenOutIndex,
                    maxBptAmountIn: input.slippage.applyTo(input.bptIn.amount),
                };
            case ExitKind.SINGLE_ASSET:
                if (input.tokenOutIndex === undefined) {
                    throw new Error(
                        'tokenOutIndex must be defined for SINGLE_ASSET exit',
                    );
                }
                return {
                    minAmountsOut: input.amountsOut.map((a) =>
                        input.slippage.removeFrom(a.amount),
                    ),
                    tokenOutIndex: input.tokenOutIndex,
                    maxBptAmountIn: input.bptIn.amount,
                };
            case ExitKind.PROPORTIONAL:
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
            case ExitKind.UNBALANCED:
                return WeightedEncoder.exitUnbalanced(
                    amounts.minAmountsOut,
                    amounts.maxBptAmountIn,
                );
            case ExitKind.SINGLE_ASSET:
                if (amounts.tokenOutIndex === undefined)
                    throw Error('No Index');

                return WeightedEncoder.exitSingleAsset(
                    amounts.maxBptAmountIn,
                    amounts.tokenOutIndex,
                );
            case ExitKind.PROPORTIONAL:
                return WeightedEncoder.exitProportional(amounts.maxBptAmountIn);
            default:
                throw Error('Unsupported Exit Type');
        }
    }
}
