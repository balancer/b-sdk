import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import { getSortedTokens } from '@/entities/utils';
import { Hex } from '@/types';
import {
    BALANCER_ROUTER,
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
} from '../types';
import { doRemoveLiquiditySingleTokenExactOutQuery } from './doRemoveLiquiditySingleTokenExactOutQuery';
import { doRemoveLiquiditySingleTokenExactInQuery } from './doRemoveLiquiditySingleTokenExactInQuery';
import { doRemoveLiquidityProportionalQuery } from './doRemoveLiquidityProportionalQuery';
import { doRemoveLiquidityRecoveryQuery } from './doRemoveLiquidityRecoveryQuery';
import { encodeRemoveLiquiditySingleTokenExactOut } from './encodeRemoveLiquiditySingleTokenExactOut';
import { encodeRemoveLiquiditySingleTokenExactIn } from './encodeRemoveLiquiditySingleTokenExactIn';
import { encodeRemoveLiquidityProportional } from './encodeRemoveLiquidityProportional';
import { encodeRemoveLiquidityRecovery } from './encodeRemoveLiquidityRecovery';
import { encodeFunctionData, zeroAddress } from 'viem';
import { balancerRouterAbiExtended } from '@/abi';
import { Permit } from '@/entities/permitHelper';

export class RemoveLiquidityV3 implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
        block?: bigint,
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
                            input.rpcUrl,
                            input.chainId,
                            input.sender ?? zeroAddress,
                            input.userData ?? '0x',
                            poolState.address,
                            input.amountOut.address,
                            input.amountOut.rawAmount,
                            block,
                        );
                    minAmountsOut = amounts.minAmountsOut;
                }
                break;
            case RemoveLiquidityKind.SingleTokenExactIn:
                {
                    maxBptAmountIn = amounts.maxBptAmountIn;
                    const minAmountOut =
                        await doRemoveLiquiditySingleTokenExactInQuery(
                            input.rpcUrl,
                            input.chainId,
                            input.sender ?? zeroAddress,
                            input.userData ?? '0x',
                            poolState.address,
                            input.tokenOut,
                            input.bptIn.rawAmount,
                            block,
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
                        input.rpcUrl,
                        input.chainId,
                        input.sender ?? zeroAddress,
                        input.userData ?? '0x',
                        poolState.address,
                        input.bptIn.rawAmount,
                        block,
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

        const output: RemoveLiquidityBaseQueryOutput & { userData: Hex } = {
            to: BALANCER_ROUTER[input.chainId],
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
            userData: input.userData ?? '0x',
        };

        return output;
    }

    public buildCall(
        input: RemoveLiquidityBaseBuildCallInput & { userData: Hex },
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
                    callData = encodeRemoveLiquidityRecovery(
                        input,
                        amounts.minAmountsOut,
                    );
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
        input: RemoveLiquidityBaseBuildCallInput & { userData: Hex },
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
            abi: balancerRouterAbiExtended,
            functionName: 'permitBatchAndCall',
            args,
        });

        return {
            ...buildCallOutput,
            callData,
        };
    }
}
