// A user can add liquidity to a boosted pool in various forms. The following ways are
// available:
// 1. Unbalanced - addLiquidityUnbalancedToERC4626Pool
// 2. Proportional - addLiquidityProportionalToERC4626Pool
import { TokenAmount } from '@/entities/tokenAmount';

import { Permit2 } from '@/entities/permit2Helper';

import { getAmountsCall } from '../addLiquidity/helpers';

import { PoolStateWithUnderlyings } from '@/entities/types';

import {
    AddLiquidityBaseBuildCallInput,
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

        // Technically possible to pass singleToken adds here due to type
        // disallow it for this class
        // TODO: Use input validator
        const bptToken = new Token(input.chainId, poolState.address, 18);

        let bptOut: TokenAmount;
        let amountsIn: TokenAmount[];
        let tokenInIndex: number | undefined;

        // Check if userAddress and userData were provided, and assign default values if not
        if (!('userAddress' in input) || input.userAddress === undefined) {
            // TODO: I think using a random address might be better than using the 0 address.
            input.userAddress = '0x0000000000000000000000000000000000000000';
        }
        if (!('userData' in input) || input.userData === undefined) {
            input.userData = '0x';
        }
        switch (input.kind) {
            case AddLiquidityKind.Unbalanced: {
                const bptAmountOut = await doAddLiquidityUnbalancedQuery(
                    input as AddLiquidityUnbalancedInputWithUserArgs,
                    poolState.address,
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
        input: AddLiquidityBaseBuildCallInput,
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
                        '0x',
                    ],
                });
                break;
            }
            case AddLiquidityKind.Proportional: {
                callData = encodeFunctionData({
                    abi: balancerCompositeLiquidityRouterAbi,
                    functionName: 'addLiquidityProportionalToERC4626Pool',
                    args: [
                        input.poolId, // pool
                        amounts.maxAmountsIn, // maxAmountsIn
                        input.bptOut.amount, // minBptOut
                        !!input.wethIsEth, // wethisEth
                        '0x', // userData
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
        input: AddLiquidityBaseBuildCallInput,
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
