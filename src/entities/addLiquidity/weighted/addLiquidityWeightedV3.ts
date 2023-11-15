import { Token } from '../../token';
import { TokenAmount } from '../../tokenAmount';
import { BALANCER_VAULT, MAX_UINT256, ZERO_ADDRESS } from '../../../utils';
import {
    AddLiquidityBase,
    AddLiquidityBuildOutput,
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidityBaseQueryOutputV3,
    AddLiquidityWeightedV3Call,
} from '../types';
import { AddLiquidityAmounts, PoolState } from '../../types';
import {
    doAddLiquidityQueryV3,
    getAmounts,
    parseAddLiquidityArgsV3,
} from '../../utils';

export class AddLiquidityWeightedV3 implements AddLiquidityBase {
    public async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityBaseQueryOutputV3> {
        const amounts = this.getAmountsQuery(poolState.tokens, input);

        // TODO V3: The following functions are not properly implemented
        const { args, tokensIn } = parseAddLiquidityArgsV3({
            useNativeAssetAsWrappedAmountIn:
                !!input.useNativeAssetAsWrappedAmountIn,
            chainId: input.chainId,
            sortedTokens: poolState.tokens,
            poolAddress: poolState.address,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            maxAmountsIn: amounts.maxAmountsIn,
        });

        const queryOutput = await doAddLiquidityQueryV3(
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
            poolAddress: poolState.address,
            bptOut,
            amountsIn,
            tokenInIndex: amounts.tokenInIndex,
            balancerVersion: 3,
        };
    }

    public buildCall(
        input: AddLiquidityWeightedV3Call,
    ): AddLiquidityBuildOutput {
        const amounts = this.getAmountsCall(input);

        // TODO V3: The following functions are not properly implemented
        // rome-ignore lint/correctness/noUnusedVariables: <explanation>
        const { args } = parseAddLiquidityArgsV3({
            ...input,
            sortedTokens: input.amountsIn.map((a) => a.token),
            maxAmountsIn: amounts.maxAmountsIn,
        });

        // TODO V3: Update with V3 encoding
        // const call = encodeFunctionData({
        //     abi: vaultAbi,
        //     functionName: 'joinPool',
        //     args,
        // });

        const value = input.amountsIn.find(
            (a) => a.token.address === ZERO_ADDRESS,
        )?.amount;

        return {
            call: '0x', // TODO V3
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
        input: AddLiquidityWeightedV3Call,
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
}
