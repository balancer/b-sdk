// A user can add liquidity to a boosted pool in various forms. The following ways are
// available:
// 1. Unbalanced - addLiquidityUnbalancedToERC4626Pool
// 2. Proportional - addLiquidityProportionalToERC4626Pool
import { encodeFunctionData, zeroAddress } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';

import { Permit2 } from '@/entities/permit2Helper';

import { getAmountsCall } from '../addLiquidity/helpers';

import { PoolStateWithUnderlyings } from '@/entities/types';

import { getAmounts, getSortedTokens } from '@/entities/utils';

import {
    AddLiquidityBuildCallOutput,
    AddLiquidityKind,
} from '../addLiquidity/types';

import { doAddLiquidityUnbalancedQuery } from './doAddLiquidityUnbalancedQuery';
import { doAddLiquidityProportionalQuery } from './doAddLiquidityPropotionalQuery';
import { Token } from '../token';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER } from '@/utils';
import { balancerCompositeLiquidityRouterAbi, balancerRouterAbi } from '@/abi';

import { InputValidator } from '../inputValidator/inputValidator';

import { Hex } from '@/types';
import {
    AddLiquidityBoostedBuildCallInput,
    AddLiquidityBoostedInput,
    AddLiquidityBoostedQueryOutput,
} from './types';

export class AddLiquidityBoostedV3 {
    private readonly inputValidator: InputValidator = new InputValidator();

    async query(
        input: AddLiquidityBoostedInput,
        poolState: PoolStateWithUnderlyings,
    ): Promise<AddLiquidityBoostedQueryOutput> {
        this.inputValidator.validateAddLiquidityBoosted(input, {
            ...poolState,
            type: 'Boosted',
        });

        const bptToken = new Token(input.chainId, poolState.address, 18);

        let bptOut: TokenAmount;
        let amountsIn: TokenAmount[];

        switch (input.kind) {
            case AddLiquidityKind.Unbalanced: {
                // It is allowed not not provide the same amount of TokenAmounts as inputs
                // as the pool has tokens, in this case, the input tokens are filled with
                // a default value ( 0 in this case ) to assure correct amounts in as the pool has tokens.
                const underlyingTokens = poolState.tokens.map((t) => {
                    return t.underlyingToken;
                });
                const sortedTokens = getSortedTokens(
                    underlyingTokens,
                    input.chainId,
                );
                const maxAmountsIn = getAmounts(sortedTokens, input.amountsIn);

                const bptAmountOut = await doAddLiquidityUnbalancedQuery(
                    input.rpcUrl,
                    input.chainId,
                    input.userAddress ?? zeroAddress,
                    input.userData ?? '0x',
                    poolState.address,
                    maxAmountsIn,
                );
                bptOut = TokenAmount.fromRawAmount(bptToken, bptAmountOut);

                amountsIn = input.amountsIn.map((t) => {
                    return TokenAmount.fromRawAmount(
                        new Token(input.chainId, t.address, t.decimals),
                        t.rawAmount,
                    );
                });

                break;
            }
            case AddLiquidityKind.Proportional: {
                if (input.referenceAmount.address !== poolState.address) {
                    // TODO: add getBptAmountFromReferenceAmount
                    throw new Error('Reference token must be the pool token');
                }

                const exactAmountsInNumbers =
                    await doAddLiquidityProportionalQuery(
                        input.rpcUrl,
                        input.chainId,
                        input.userAddress ?? zeroAddress,
                        input.userData ?? '0x',
                        poolState.address,
                        input.referenceAmount.rawAmount,
                    );

                // Since the user adds tokens which are technically not pool tokens, the TokenAmount to return
                // uses the pool's tokens underlyingTokens to indicate which tokens are being added from the user
                // perspective
                amountsIn = poolState.tokens.map((t, i) =>
                    TokenAmount.fromRawAmount(
                        new Token(
                            input.chainId,
                            t.underlyingToken.address,
                            t.underlyingToken.decimals,
                        ),
                        exactAmountsInNumbers[i],
                    ),
                );

                bptOut = TokenAmount.fromRawAmount(
                    bptToken,
                    input.referenceAmount.rawAmount,
                );
                break;
            }
        }

        const output: AddLiquidityBoostedQueryOutput = {
            poolId: poolState.id,
            poolType: poolState.type,
            addLiquidityKind: input.kind,
            bptOut,
            amountsIn,
            chainId: input.chainId,
            protocolVersion: 3,
            userData: input.userData ?? '0x',
        };

        return output;
    }

    buildCall(
        input: AddLiquidityBoostedBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);
        const args = [
            input.poolId,
            amounts.maxAmountsIn,
            amounts.minimumBpt,
            false,
            input.userData,
        ] as const;
        let callData: Hex;
        switch (input.addLiquidityKind) {
            case AddLiquidityKind.Unbalanced: {
                callData = encodeFunctionData({
                    abi: balancerCompositeLiquidityRouterAbi,
                    functionName: 'addLiquidityUnbalancedToERC4626Pool',
                    args,
                });
                break;
            }
            case AddLiquidityKind.Proportional: {
                callData = encodeFunctionData({
                    abi: balancerCompositeLiquidityRouterAbi,
                    functionName: 'addLiquidityProportionalToERC4626Pool',
                    args,
                });
                break;
            }
            case AddLiquidityKind.SingleToken: {
                throw new Error('SingleToken not supported');
            }
        }
        return {
            callData,
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[input.chainId],
            value: 0n, // Default to 0 as native not supported
            minBptOut: TokenAmount.fromRawAmount(
                input.bptOut.token,
                amounts.minimumBpt,
            ),
            maxAmountsIn: input.amountsIn.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.maxAmountsIn[i]),
            ),
        };
    }

    public buildCallWithPermit2(
        input: AddLiquidityBoostedBuildCallInput,
        permit2: Permit2,
    ): AddLiquidityBuildCallOutput {
        // generate same calldata as buildCall
        const buildCallOutput = this.buildCall(input);

        const args = [
            [],
            [],
            permit2.batch,
            permit2.signature,
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
