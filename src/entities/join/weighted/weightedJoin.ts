import { encodeFunctionData } from 'viem';
import { Token, TokenAmount, WeightedEncoder } from '../../..';
import { Address } from '../../../types';
import { BALANCER_VAULT, MAX_UINT256, ZERO_ADDRESS } from '../../../utils';
import { vaultAbi } from '../../../abi';
import { checkInputs } from './helpers';
import {
    BaseJoin,
    JoinCallInput,
    JoinInput,
    JoinKind,
    JoinQueryResult,
} from '..';
import { PoolState, Amounts } from '../../types';
import {
    doQueryJoin,
    getAmounts,
    parseJoinArgs,
    getSortedTokens,
} from '../../utils';

export class WeightedJoin implements BaseJoin {
    public async query(
        input: JoinInput,
        poolState: PoolState,
    ): Promise<JoinQueryResult> {
        checkInputs(input, poolState);

        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);

        const amounts = this.getAmountsQuery(sortedTokens, input);

        const userData = this.encodeUserData(input.kind, amounts);

        const queryArgs = parseJoinArgs({
            joinWithNativeAsset: !!input.joinWithNativeAsset,
            chainId: input.chainId,
            sortedTokens,
            poolId: poolState.id,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
        });

        const queryResult = await doQueryJoin(
            input.rpcUrl,
            input.chainId,
            queryArgs,
        );

        const bpt = new Token(input.chainId, poolState.address, 18);
        const bptOut = TokenAmount.fromRawAmount(bpt, queryResult.bptOut);

        const amountsIn = queryResult.amountsIn.map((a, i) =>
            TokenAmount.fromRawAmount(sortedTokens[i], a),
        );

        return {
            joinKind: input.kind,
            poolId: poolState.id,
            bptOut,
            amountsIn,
            tokenInIndex: amounts.tokenInIndex,
        };
    }

    public buildCall(input: JoinCallInput): {
        call: Address;
        to: Address;
        value: bigint | undefined;
        minBptOut: bigint;
        maxAmountsIn: bigint[];
    } {
        const amounts = this.getAmountsCall(input);

        const userData = this.encodeUserData(input.joinKind, amounts);

        const args = parseJoinArgs({
            ...input,
            sortedTokens: input.amountsIn.map((a) => a.token),
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
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
            value,
            minBptOut: amounts.minimumBpt,
            maxAmountsIn: amounts.maxAmountsIn,
        };
    }

    private getAmountsQuery(poolTokens: Token[], input: JoinInput): Amounts {
        switch (input.kind) {
            case JoinKind.Init:
            case JoinKind.Unbalanced: {
                return {
                    minimumBpt: 0n,
                    maxAmountsIn: getAmounts(poolTokens, input.amountsIn),
                    tokenInIndex: undefined,
                };
            }
            case JoinKind.SingleAsset: {
                const tokenInIndex = poolTokens.findIndex(
                    (t) => t.address === input.tokenIn.toLowerCase(),
                );
                if (tokenInIndex === -1)
                    throw Error("Can't find index of SingleAsset");
                const maxAmountsIn = Array(poolTokens.length).fill(0n);
                maxAmountsIn[tokenInIndex] = MAX_UINT256;
                return {
                    minimumBpt: input.bptOut.amount,
                    maxAmountsIn,
                    tokenInIndex,
                };
            }
            case JoinKind.Proportional: {
                return {
                    minimumBpt: input.bptOut.amount,
                    maxAmountsIn: Array(poolTokens.length).fill(MAX_UINT256),
                    tokenInIndex: undefined,
                };
            }
            default:
                throw Error('Unsupported Join Type');
        }
    }

    private getAmountsCall(input: JoinCallInput): Amounts {
        switch (input.joinKind) {
            case JoinKind.Init:
            case JoinKind.Unbalanced: {
                const minimumBpt = input.slippage.removeFrom(
                    input.bptOut.amount,
                );
                return {
                    minimumBpt,
                    maxAmountsIn: input.amountsIn.map((a) => a.amount),
                    tokenInIndex: input.tokenInIndex,
                };
            }
            case JoinKind.SingleAsset:
            case JoinKind.Proportional: {
                return {
                    minimumBpt: input.bptOut.amount,
                    maxAmountsIn: input.amountsIn.map((a) =>
                        input.slippage.applyTo(a.amount),
                    ),
                    tokenInIndex: input.tokenInIndex,
                };
            }
            default:
                throw Error('Unsupported Join Type');
        }
    }

    private encodeUserData(kind: JoinKind, amounts: Amounts): Address {
        switch (kind) {
            case JoinKind.Init:
                return WeightedEncoder.joinInit(amounts.maxAmountsIn);
            case JoinKind.Unbalanced:
                return WeightedEncoder.joinUnbalanced(
                    amounts.maxAmountsIn,
                    amounts.minimumBpt,
                );
            case JoinKind.SingleAsset: {
                if (amounts.tokenInIndex === undefined) throw Error('No Index');
                return WeightedEncoder.joinSingleAsset(
                    amounts.minimumBpt,
                    amounts.tokenInIndex,
                );
            }
            case JoinKind.Proportional: {
                return WeightedEncoder.joinProportional(amounts.minimumBpt);
            }
            default:
                throw Error('Unsupported Join Type');
        }
    }
}
