import { encodeFunctionData } from 'viem';
import { Token } from '../../token';
import { TokenAmount } from '../../tokenAmount';
import { WeightedEncoder } from '../../encoders/weighted';
import { Address } from '../../../types';
import { BALANCER_VAULT, MAX_UINT256, ZERO_ADDRESS } from '../../../utils';
import { vaultAbi } from '../../../abi';
import {
    AddLiquidityBase,
    AddLiquidityBuildOutput,
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidityBaseQueryOutputV2,
    AddLiquidityWeightedV2Call,
} from '../types';
import { AddLiquidityAmounts, PoolState } from '../../types';
import {
    doAddLiquidityQueryV2,
    getAmounts,
    parseAddLiquidityArgsV2,
} from '../../utils';

export class AddLiquidityWeightedV2 implements AddLiquidityBase {
    public async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityBaseQueryOutputV2> {
        const amounts = this.getAmountsQuery(poolState.tokens, input);

        const userData = this.encodeUserData(input.kind, amounts);

        const { args, tokensIn } = parseAddLiquidityArgsV2({
            useNativeAssetAsWrappedAmountIn:
                !!input.useNativeAssetAsWrappedAmountIn,
            chainId: input.chainId,
            sortedTokens: poolState.tokens,
            poolId: poolState.id,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: input.fromInternalBalance ?? false,
        });

        const queryOutput = await doAddLiquidityQueryV2(
            input.rpcUrl,
            input.chainId,
            args,
        );

        const bpt = new Token(input.chainId, poolState.address, 18);
        const bptOut = TokenAmount.fromRawAmount(bpt, queryOutput.bptOut);

        const amountsIn = queryOutput.amountsIn.map((a, i) =>
            TokenAmount.fromRawAmount(tokensIn[i], a),
        );

        return {
            poolType: poolState.type,
            addLiquidityKind: input.kind,
            poolId: poolState.id,
            bptOut,
            amountsIn,
            tokenInIndex: amounts.tokenInIndex,
            fromInternalBalance: !!input.fromInternalBalance,
            balancerVersion: 2,
        };
    }

    public buildCall(
        input: AddLiquidityWeightedV2Call,
    ): AddLiquidityBuildOutput {
        const amounts = this.getAmountsCall(input);

        const userData = this.encodeUserData(input.addLiquidityKind, amounts);

        const { args } = parseAddLiquidityArgsV2({
            ...input,
            sortedTokens: input.amountsIn.map((a) => a.token),
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: input.fromInternalBalance,
        });

        const call = encodeFunctionData({
            abi: vaultAbi,
            functionName: 'joinPool',
            args,
        });

        const value = input.amountsIn.find(
            (a) => a.token.address === ZERO_ADDRESS,
        )?.amount;

        return {
            call,
            to: BALANCER_VAULT,
            value: value === undefined ? 0n : value,
            minBptOut: TokenAmount.fromRawAmount(
                input.bptOut.token,
                amounts.minimumBpt,
            ),
            maxAmountsIn: input.amountsIn.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.maxAmountsIn[i]),
            ),
        };
    }

    private getAmountsQuery(
        poolTokens: Token[],
        input: AddLiquidityInput,
    ): AddLiquidityAmounts {
        switch (input.kind) {
            case AddLiquidityKind.Init:
            case AddLiquidityKind.Unbalanced: {
                return {
                    minimumBpt: 0n,
                    maxAmountsIn: getAmounts(poolTokens, input.amountsIn),
                    tokenInIndex: undefined,
                };
            }
            case AddLiquidityKind.SingleToken: {
                const tokenInIndex = poolTokens.findIndex((t) =>
                    t.isSameAddress(input.tokenIn),
                );
                if (tokenInIndex === -1)
                    throw Error("Can't find index of SingleToken");
                const maxAmountsIn = Array(poolTokens.length).fill(0n);
                maxAmountsIn[tokenInIndex] = MAX_UINT256;
                return {
                    minimumBpt: input.bptOut.rawAmount,
                    maxAmountsIn,
                    tokenInIndex,
                };
            }
            case AddLiquidityKind.Proportional: {
                return {
                    minimumBpt: input.bptOut.rawAmount,
                    maxAmountsIn: Array(poolTokens.length).fill(MAX_UINT256),
                    tokenInIndex: undefined,
                };
            }
            default:
                throw Error('Unsupported Add Liquidity Kind');
        }
    }

    private getAmountsCall(
        input: AddLiquidityWeightedV2Call,
    ): AddLiquidityAmounts {
        switch (input.addLiquidityKind) {
            case AddLiquidityKind.Init:
            case AddLiquidityKind.Unbalanced: {
                const minimumBpt = input.slippage.removeFrom(
                    input.bptOut.amount,
                );
                return {
                    minimumBpt,
                    maxAmountsIn: input.amountsIn.map((a) => a.amount),
                    tokenInIndex: input.tokenInIndex,
                };
            }
            case AddLiquidityKind.SingleToken:
            case AddLiquidityKind.Proportional: {
                return {
                    minimumBpt: input.bptOut.amount,
                    maxAmountsIn: input.amountsIn.map((a) =>
                        input.slippage.applyTo(a.amount),
                    ),
                    tokenInIndex: input.tokenInIndex,
                };
            }
            default:
                throw Error('Unsupported Add Liquidity Kind');
        }
    }

    private encodeUserData(
        kind: AddLiquidityKind,
        amounts: AddLiquidityAmounts,
    ): Address {
        switch (kind) {
            case AddLiquidityKind.Init:
                return WeightedEncoder.addLiquidityInit(amounts.maxAmountsIn);
            case AddLiquidityKind.Unbalanced:
                return WeightedEncoder.addLiquidityUnbalanced(
                    amounts.maxAmountsIn,
                    amounts.minimumBpt,
                );
            case AddLiquidityKind.SingleToken: {
                if (amounts.tokenInIndex === undefined) throw Error('No Index');
                return WeightedEncoder.addLiquiditySingleToken(
                    amounts.minimumBpt,
                    amounts.tokenInIndex,
                );
            }
            case AddLiquidityKind.Proportional: {
                return WeightedEncoder.addLiquidityProportional(
                    amounts.minimumBpt,
                );
            }
            default:
                throw Error('Unsupported Add Liquidity Kind');
        }
    }
}
