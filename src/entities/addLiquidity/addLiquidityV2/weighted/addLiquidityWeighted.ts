import { encodeFunctionData } from 'viem';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { WeightedEncoder } from '@/entities/encoders/weighted';
import { VAULT, MAX_UINT256, ZERO_ADDRESS } from '@/utils';
import { vaultV2Abi } from '@/abi';
import {
    AddLiquidityBase,
    AddLiquidityBuildOutput,
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidityWeightedQueryOutput,
    AddLiquidityWeightedCall,
} from '@/entities/addLiquidity/types';
import { AddLiquidityAmounts, PoolState } from '@/entities/types';
import {
    doAddLiquidityQuery,
    getAmounts,
    getSortedTokens,
    parseAddLiquidityArgs,
} from '@/entities/utils';

export class AddLiquidityWeighted implements AddLiquidityBase {
    public async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityWeightedQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = this.getAmountsQuery(sortedTokens, input);

        const userData = WeightedEncoder.encodeAddLiquidityUserData(
            input.kind,
            amounts,
        );

        const { args, tokensIn } = parseAddLiquidityArgs({
            useNativeAssetAsWrappedAmountIn:
                !!input.useNativeAssetAsWrappedAmountIn,
            chainId: input.chainId,
            sortedTokens,
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
            balancerVersion: 2,
        };
    }

    public buildCall(input: AddLiquidityWeightedCall): AddLiquidityBuildOutput {
        const amounts = this.getAmountsCall(input);

        const userData = WeightedEncoder.encodeAddLiquidityUserData(
            input.addLiquidityKind,
            amounts,
        );

        const { args } = parseAddLiquidityArgs({
            ...input,
            sortedTokens: input.amountsIn.map((a) => a.token),
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: input.fromInternalBalance,
        });

        const call = encodeFunctionData({
            abi: vaultV2Abi,
            functionName: 'joinPool',
            args,
        });

        const value = input.amountsIn.find(
            (a) => a.token.address === ZERO_ADDRESS,
        )?.amount;

        return {
            call,
            to: VAULT[input.chainId],
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
        }
    }

    private getAmountsCall(
        input: AddLiquidityWeightedCall,
    ): AddLiquidityAmounts {
        switch (input.addLiquidityKind) {
            case AddLiquidityKind.Init:
                throw Error('Unsupported Add Liquidity Kind');
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
}
