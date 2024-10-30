// A user can add liquidity to a boosted pool in various forms. The following ways are
// available:
// 1. Unbalanced - addLiquidityUnbalancedToERC4626Pool
// 2. Proportional - addLiquidityProportionalToERC4626Pool
import { TokenAmount } from '@/entities/tokenAmount';

import { Permit2 } from '@/entities/permit2Helper';

import { getAmountsCall } from '../addLiquidity/helpers';

import { PoolStateWithUnderlyings } from '@/entities/types';

import { getAmounts, getSortedTokens } from '@/entities/utils';

import {
    AddLiquidityBoostedBuildCallInput,
    AddLiquidityBoostedQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityBoostedWithOptionalInput,
    AddLiquidityUnbalancedInputWithUserArgs,
    AddLiquidityProportionalInputWithUserArgs,
    AddLiquidityKind,
} from '../addLiquidity/types';

import { doAddLiquidityUnbalancedQuery } from './doAddLiquidityUnbalancedQuery';
import { doAddLiquidityProportionalQuery } from './doAddLiquidityPropotionalQuery';
import { Token } from '../token';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER } from '@/utils';

import { getValue } from '@/entities/utils/getValue';
import { encodeFunctionData } from 'viem';
import { balancerCompositeLiquidityRouterAbi, balancerRouterAbi } from '@/abi';

import { InputValidator } from '../inputValidator/inputValidator';

import { Hex } from '@/types';

export class AddLiquidityBoostedV3 {
    private readonly inputValidator: InputValidator = new InputValidator();

    async query(
        input: AddLiquidityBoostedWithOptionalInput,
        poolState: PoolStateWithUnderlyings,
    ): Promise<AddLiquidityBoostedQueryOutput> {
        this.inputValidator.validateAddLiquidityBoosted(input, {
            ...poolState,
            type: 'Boosted',
        });

        const bptToken = new Token(input.chainId, poolState.address, 18);

        let bptOut: TokenAmount;
        let amountsIn: TokenAmount[];
        let tokenInIndex: number | undefined;

        // Check if userAddress and userData were provided, and assign default values if not
        if (!('userAddress' in input) || input.userAddress === undefined) {
            input.userAddress = '0x0000000000000000000000000000000000000000';
        }
        if (!('userData' in input) || input.userData === undefined) {
            input.userData = '0x';
        }
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
                    input as AddLiquidityUnbalancedInputWithUserArgs,
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
                        input as AddLiquidityProportionalInputWithUserArgs,
                        poolState.address,
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
            poolType: poolState.type,
            poolId: poolState.id,
            addLiquidityKind: input.kind,
            bptOut,
            amountsIn,
            tokenInIndex,
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
        let callData: Hex;
        switch (input.addLiquidityKind) {
            case AddLiquidityKind.Unbalanced: {
                callData = encodeFunctionData({
                    abi: balancerCompositeLiquidityRouterAbi,
                    functionName: 'addLiquidityUnbalancedToERC4626Pool',
                    args: [
                        input.poolId,
                        input.amountsIn.map((amount) => amount.amount),
                        amounts.minimumBpt,
                        false,
                        input.userData ? input.userData : '0x',
                    ],
                });
                break;
            }
            case AddLiquidityKind.Proportional: {
                callData = encodeFunctionData({
                    abi: balancerCompositeLiquidityRouterAbi,
                    functionName: 'addLiquidityProportionalToERC4626Pool',
                    args: [
                        input.poolId,
                        amounts.maxAmountsIn,
                        input.bptOut.amount,
                        !!input.wethIsEth,
                        input.userData ? input.userData : '0x',
                    ],
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
            value: getValue(input.amountsIn, !!input.wethIsEth),
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