import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState, PoolStateWithBalances } from '@/entities/types';
import {
    calculateProportionalAmounts,
    getSortedTokens,
} from '@/entities/utils';
import { Hex } from '@/types';
import {
    BALANCER_ROUTER,
    CHAINS,
    removeLiquidityUnbalancedNotSupportedOnV3,
} from '@/utils';

import { getAmountsCall, getAmountsQuery } from '../helper';
import {
    RemoveLiquidityBase,
    RemoveLiquidityBaseBuildCallInput,
    RemoveLiquidityBaseQueryOutput,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityInput,
    RemoveLiquidityKind,
    RemoveLiquidityRecoveryInput,
} from '../types';
import { doRemoveLiquiditySingleTokenExactOutQuery } from './doRemoveLiquiditySingleTokenExactOutQuery';
import { doRemoveLiquiditySingleTokenExactInQuery } from './doRemoveLiquiditySingleTokenExactInQuery';
import { doRemoveLiquidityProportionalQuery } from './doRemoveLiquidityProportionalQuery';
import { doRemoveLiquidityRecoveryQuery } from './doRemoveLiquidityRecoveryQuery';
import { encodeRemoveLiquiditySingleTokenExactOut } from './encodeRemoveLiquiditySingleTokenExactOut';
import { encodeRemoveLiquiditySingleTokenExactIn } from './encodeRemoveLiquiditySingleTokenExactIn';
import { encodeRemoveLiquidityProportional } from './encodeRemoveLiquidityProportional';
import { encodeRemoveLiquidityRecovery } from './encodeRemoveLiquidityRecovery';
import {
    createPublicClient,
    encodeFunctionData,
    formatEther,
    formatUnits,
    http,
    zeroAddress,
} from 'viem';
import { getPoolTokensV2, getTotalSupply } from '@/utils/tokens';
import { HumanAmount } from '@/data';
import { balancerRouterAbi } from '@/abi';
import { Permit } from '@/entities/permit';

export class RemoveLiquidityV3 implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityBaseQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = getAmountsQuery(sortedTokens, input);

        let maxBptAmountIn: bigint;
        let minAmountsOut: readonly bigint[];

        switch (input.kind) {
            case RemoveLiquidityKind.Unbalanced:
                throw removeLiquidityUnbalancedNotSupportedOnV3;
            case RemoveLiquidityKind.SingleTokenExactOut:
                {
                    maxBptAmountIn =
                        await doRemoveLiquiditySingleTokenExactOutQuery(
                            input,
                            poolState.address,
                        );
                    minAmountsOut = amounts.minAmountsOut;
                }
                break;
            case RemoveLiquidityKind.SingleTokenExactIn:
                {
                    maxBptAmountIn = amounts.maxBptAmountIn;
                    const minAmountOut =
                        await doRemoveLiquiditySingleTokenExactInQuery(
                            input,
                            poolState.address,
                        );
                    minAmountsOut = sortedTokens.map((t) => {
                        return t.isSameAddress(input.tokenOut)
                            ? minAmountOut
                            : 0n;
                    });
                }
                break;
            case RemoveLiquidityKind.Proportional:
                {
                    maxBptAmountIn = amounts.maxBptAmountIn;
                    minAmountsOut = await doRemoveLiquidityProportionalQuery(
                        input,
                        poolState.address,
                    );
                }
                break;
            case RemoveLiquidityKind.Recovery:
                {
                    maxBptAmountIn = amounts.maxBptAmountIn;
                    minAmountsOut = await doRemoveLiquidityRecoveryQuery(
                        input,
                        poolState.address,
                    );
                }
                break;
        }

        const bptToken = new Token(input.chainId, poolState.address, 18);

        const output: RemoveLiquidityBaseQueryOutput = {
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn: TokenAmount.fromRawAmount(bptToken, maxBptAmountIn),
            amountsOut: sortedTokens.map((t, i) =>
                TokenAmount.fromRawAmount(t, minAmountsOut[i]),
            ),
            tokenOutIndex: amounts.tokenOutIndex,
            protocolVersion: poolState.protocolVersion,
            chainId: input.chainId,
        };

        return output;
    }

    /**
     * It's not possible to query Remove Liquidity Recovery in the same way as
     * other remove liquidity kinds, but since it's not affected by fees or anything
     * other than pool balances, we can calculate amountsOut as proportional amounts.
     */
    public async queryRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityBaseQueryOutput> {
        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainId],
        });

        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        // FIXME: this should be updated with v3 implementation - still pending from SC team
        const [_, tokenBalances] = await getPoolTokensV2(
            poolState.address,
            client,
        );
        const totalShares = await getTotalSupply(poolState.address, client);

        const poolStateWithBalances: PoolStateWithBalances = {
            ...poolState,
            tokens: sortedTokens.map((token, i) => ({
                address: token.address,
                decimals: token.decimals,
                index: i,
                balance: formatUnits(
                    tokenBalances[i],
                    token.decimals,
                ) as HumanAmount,
            })),
            totalShares: formatEther(totalShares) as HumanAmount,
        };

        const { tokenAmounts, bptAmount } = calculateProportionalAmounts(
            poolStateWithBalances,
            input.bptIn,
        );
        const bptIn = TokenAmount.fromRawAmount(
            new Token(input.chainId, bptAmount.address, bptAmount.decimals),
            bptAmount.rawAmount,
        );
        const amountsOut = tokenAmounts.map((amountIn) =>
            TokenAmount.fromRawAmount(
                new Token(input.chainId, amountIn.address, amountIn.decimals),
                amountIn.rawAmount,
            ),
        );
        return {
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex: undefined,
            protocolVersion: poolState.protocolVersion,
            chainId: input.chainId,
        };
    }

    public buildCall(
        input: RemoveLiquidityBaseBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);

        let callData: Hex;
        switch (input.removeLiquidityKind) {
            case RemoveLiquidityKind.Unbalanced:
                throw removeLiquidityUnbalancedNotSupportedOnV3;
            case RemoveLiquidityKind.SingleTokenExactOut:
                {
                    callData = encodeRemoveLiquiditySingleTokenExactOut(
                        input,
                        amounts.maxBptAmountIn,
                    );
                }
                break;
            case RemoveLiquidityKind.SingleTokenExactIn:
                {
                    callData = encodeRemoveLiquiditySingleTokenExactIn(
                        input,
                        amounts.minAmountsOut,
                    );
                }
                break;
            case RemoveLiquidityKind.Proportional:
                {
                    callData = encodeRemoveLiquidityProportional(
                        input,
                        amounts.minAmountsOut,
                    );
                }
                break;
            case RemoveLiquidityKind.Recovery:
                {
                    callData = encodeRemoveLiquidityRecovery(input);
                }
                break;
        }

        return {
            callData,
            to: BALANCER_ROUTER[input.chainId],
            value: 0n, // remove liquidity always has value = 0
            maxBptIn: TokenAmount.fromRawAmount(
                input.bptIn.token,
                amounts.maxBptAmountIn,
            ),
            minAmountsOut: input.amountsOut.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.minAmountsOut[i]),
            ),
        };
    }

    public buildCallWithPermit(
        input: RemoveLiquidityBaseBuildCallInput,
        permit: Permit,
    ): RemoveLiquidityBuildCallOutput {
        const buildCallOutput = this.buildCall(input);

        const args = [
            permit.batch,
            permit.signatures,
            { details: [], spender: zeroAddress, sigDeadline: 0n },
            '0x',
            [buildCallOutput.callData],
        ] as const;

        const callData = encodeFunctionData({
            abi: balancerRouterAbi,
            functionName: 'permitBatchAndCall',
            args,
        });

        return {
            ...buildCallOutput,
            callData,
        };
    }
}
