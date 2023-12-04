import { encodeFunctionData, formatUnits, parseEther } from 'viem';
import { Token } from '../../token';
import { TokenAmount } from '../../tokenAmount';
import { WeightedEncoder } from '../../encoders/weighted';
import { Address, WeightedInitInputAmount } from '../../../types';
import { BALANCER_VAULT, MAX_UINT256, ZERO_ADDRESS } from '../../../utils';
import { vaultAbi } from '../../../abi';
import {
    AddLiquidityBase,
    AddLiquidityBuildOutput,
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidityWeightedQueryOutput,
    AddLiquidityWeightedCall,
    AddLiquidityInitInput,
} from '../types';
import { AddLiquidityAmounts, PoolState } from '../../types';
import {
    doAddLiquidityQuery,
    getAmounts,
    parseAddLiquidityArgs,
} from '../../utils';
import { sortTokensByAddress } from '../../../utils/tokens';

export class AddLiquidityWeighted implements AddLiquidityBase {
    public async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityWeightedQueryOutput> {
        const amounts = this.getAmountsQuery(poolState.tokens, input);

        const userData = this.encodeUserData(input.kind, amounts);

        const { args, tokensIn } = parseAddLiquidityArgs({
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

        const queryOutput = await doAddLiquidityQuery(
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
        };
    }

    public buildCall(input: AddLiquidityWeightedCall): AddLiquidityBuildOutput {
        const amounts = this.getAmountsCall(input);

        const userData = this.encodeUserData(input.addLiquidityKind, amounts);

        const { args } = parseAddLiquidityArgs({
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

    public buildInitCall(input: AddLiquidityInitInput, poolState: PoolState) {
        const amounts = this.getAmountsForInit(input, poolState.tokens);
        const userData = this.encodeUserData(input.kind, amounts);
        const bpt = new Token(input.chainId, poolState.address, 18);
        const { args } = parseAddLiquidityArgs({
            ...input,
            poolId: poolState.id,
            sortedTokens: sortTokensByAddress(poolState.tokens),
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: input.fromInternalBalance ?? false,
        });

        const call = encodeFunctionData({
            abi: vaultAbi,
            functionName: 'joinPool',
            args,
        });

        const value = input.amountsIn.find(
            (a) => a.address === ZERO_ADDRESS,
        )?.rawAmount;

        return {
            call,
            to: BALANCER_VAULT as Address,
            value: value === undefined ? 0n : value,
            minBptOut: TokenAmount.fromRawAmount(bpt, amounts.minimumBpt),
            maxAmountsIn: sortTokensByAddress(poolState.tokens).map((t, i) =>
                TokenAmount.fromRawAmount(t, amounts.maxAmountsIn[i]),
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
        input: AddLiquidityWeightedCall,
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

    private getAmountsForInit(
        input: AddLiquidityInitInput,
        poolTokens: Token[],
    ): AddLiquidityAmounts {
        const minimumBpt = this.calculateInitBptOut(
            input.amountsIn as WeightedInitInputAmount[],
        );
        return {
            minimumBpt,
            maxAmountsIn: getAmounts(
                sortTokensByAddress(poolTokens),
                input.amountsIn,
            ),
            tokenInIndex: undefined,
        };
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

    private calculateInitBptOut(amounts: WeightedInitInputAmount[]): bigint {
        const tokensQtd = amounts.length;
        const poolInvariant = amounts.reduce((acc, curr) => {
            return (
                acc *
                parseFloat(formatUnits(curr.rawAmount, curr.decimals)) **
                    parseFloat(formatUnits(BigInt(curr.weight), 18))
            );
        }, 1);
        const bptOut = poolInvariant * tokensQtd;
        return parseEther(bptOut.toString());
    }
}
