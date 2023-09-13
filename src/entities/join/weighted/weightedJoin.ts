import { createPublicClient, encodeFunctionData, http } from 'viem';
import { Token, TokenAmount, WeightedEncoder } from '../../..';
import { Address } from '../../../types';
import {
    BALANCER_HELPERS,
    BALANCER_VAULT,
    CHAINS,
    MAX_UINT256,
    NATIVE_ASSETS,
    ZERO_ADDRESS,
} from '../../../utils';
import { balancerHelpersAbi, vaultAbi } from '../../../abi';
import { checkInputs, getJoinParameters } from './helpers';
import {
    BaseJoin,
    JoinCallInput,
    JoinInput,
    JoinKind,
    JoinQueryResult,
    PoolState,
} from '..';

export class WeightedJoin implements BaseJoin {
    public async query(
        input: JoinInput,
        poolState: PoolState,
    ): Promise<JoinQueryResult> {
        // TODO - This would need extended to work with relayer

        // TODO: Extend input validation for cases we'd like to check
        checkInputs(input, poolState);

        const poolTokens = poolState.tokens
            .sort((a, b) => a.index - b.index)
            .map((t) => new Token(input.chainId, t.address, t.decimals));
        let maxAmountsIn = Array(poolTokens.length).fill(MAX_UINT256);
        let userData: Address;

        switch (input.kind) {
            case JoinKind.Init:
                maxAmountsIn = poolTokens.map(
                    (t) =>
                        input.initAmountsIn.find((a) => a.token.isEqual(t))
                            ?.amount ?? 0n,
                );
                userData = WeightedEncoder.joinInit(maxAmountsIn);
                break;
            case JoinKind.Unbalanced:
                maxAmountsIn = poolTokens.map(
                    (t) =>
                        input.amountsIn.find((a) => a.token.isEqual(t))
                            ?.amount ?? 0n,
                );
                userData = WeightedEncoder.joinUnbalanced(maxAmountsIn, 0n);
                break;
            case JoinKind.SingleAsset:
                userData = WeightedEncoder.joinSingleAsset(
                    input.bptOut.amount,
                    poolTokens.findIndex(
                        (t) => t.address === input.tokenIn.toLowerCase(),
                    ),
                );
                break;
            case JoinKind.Proportional:
                userData = WeightedEncoder.joinProportional(
                    input.bptOut.amount,
                );
                break;
        }

        let tokensIn = [...poolTokens];
        // replace wrapped token with native asset if needed
        if (input.joinWithNativeAsset) {
            tokensIn = poolTokens.map((token) => {
                if (token.isUnderlyingEqual(NATIVE_ASSETS[input.chainId])) {
                    return new Token(input.chainId, ZERO_ADDRESS, 18);
                } else {
                    return token;
                }
            });
        }

        const queryArgs = getJoinParameters({
            poolId: poolState.id,
            assets: tokensIn.map((t) => t.address),
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            maxAmountsIn,
            userData,
        });

        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainId],
        });

        const {
            result: [queryBptOut, queryAmountsIn],
        } = await client.simulateContract({
            address: BALANCER_HELPERS[input.chainId],
            abi: balancerHelpersAbi,
            functionName: 'queryJoin',
            args: queryArgs,
        });

        const bpt = new Token(input.chainId, poolState.address, 18);
        const bptOut = TokenAmount.fromRawAmount(bpt, queryBptOut);

        const amountsIn = queryAmountsIn.map((a, i) =>
            TokenAmount.fromRawAmount(tokensIn[i], a),
        );

        const tokenInIndex =
            input.kind === JoinKind.SingleAsset
                ? poolTokens.findIndex(
                      (t) => t.address === input.tokenIn.toLowerCase(),
                  )
                : undefined;

        return {
            joinKind: input.kind,
            id: poolState.id,
            bptOut,
            amountsIn,
            tokenInIndex,
        };
    }

    public buildCall(input: JoinCallInput): {
        call: Address;
        to: Address;
        value: bigint | undefined;
        minBptOut: bigint;
        maxAmountsIn: bigint[];
    } {
        let maxAmountsIn = input.amountsIn.map((a) => a.amount);
        let minBptOut = input.bptOut.amount;
        let userData: Address;

        switch (input.joinKind) {
            case JoinKind.Init: {
                maxAmountsIn = input.amountsIn.map((a) => a.amount);
                userData = WeightedEncoder.joinInit(maxAmountsIn);
                break;
            }
            case JoinKind.Unbalanced: {
                maxAmountsIn = input.amountsIn.map((a) => a.amount);
                minBptOut = input.slippage.removeFrom(input.bptOut.amount);
                userData = WeightedEncoder.joinUnbalanced(
                    maxAmountsIn,
                    minBptOut,
                );
                break;
            }
            case JoinKind.SingleAsset:
                if (input.tokenInIndex === undefined) {
                    throw new Error(
                        'tokenInIndex must be defined for SingleAsset joins',
                    );
                }
                maxAmountsIn = input.amountsIn.map((a) =>
                    input.slippage.applyTo(a.amount),
                );
                userData = WeightedEncoder.joinSingleAsset(
                    input.bptOut.amount,
                    input.tokenInIndex,
                );
                break;
            case JoinKind.Proportional: {
                maxAmountsIn = input.amountsIn.map((a) =>
                    input.slippage.applyTo(a.amount),
                );
                userData = WeightedEncoder.joinProportional(
                    input.bptOut.amount,
                );
                break;
            }
        }

        const queryArgs = getJoinParameters({
            poolId: input.id,
            assets: input.amountsIn.map((a) => a.token.address),
            sender: input.sender,
            recipient: input.recipient,
            maxAmountsIn,
            userData,
        });

        const call = encodeFunctionData({
            abi: vaultAbi,
            functionName: 'joinPool',
            args: queryArgs,
        });

        const value = input.amountsIn.find(
            (a) => a.token.address === ZERO_ADDRESS,
        )?.amount;

        // Encode data
        return {
            call,
            to: BALANCER_VAULT,
            value,
            minBptOut,
            maxAmountsIn,
        };
    }
}
