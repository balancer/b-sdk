// A user can add liquidity to a boosted pool in various forms. The following ways are
// available:
// 1. Unbalanced - addLiquidityUnbalancedToERC4626Pool
// 2. Proportional - addLiquidityProportionalToERC4626Pool
import { encodeFunctionData, zeroAddress } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';

import { Permit2 } from '@/entities/permit2Helper';

import { getAmountsCall } from '../addLiquidity/helpers';

import { PoolStateWithUnderlyings } from '@/entities/types';

import {
    getAmounts,
    getBptAmountFromReferenceAmountBoosted,
    getSortedTokens,
    getValue,
} from '@/entities/utils';

import {
    AddLiquidityBuildCallOutput,
    AddLiquidityKind,
} from '../addLiquidity/types';

import { doAddLiquidityUnbalancedQuery } from './doAddLiquidityUnbalancedQuery';
import { doAddLiquidityProportionalQuery } from './doAddLiquidityPropotionalQuery';
import { Token } from '../token';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED } from '@/utils';
import {
    balancerCompositeLiquidityRouterBoostedAbi,
    balancerRouterAbi,
} from '@/abi';

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
        block?: bigint,
    ): Promise<AddLiquidityBoostedQueryOutput> {
        this.inputValidator.validateAddLiquidityBoosted(input, {
            ...poolState,
            type: 'Boosted',
        });

        const bptToken = new Token(input.chainId, poolState.address, 18);

        let bptOut: TokenAmount;
        let amountsIn: TokenAmount[];

        // Child tokens are the lowest most tokens. This will be underlying if it exists.
        const childTokens = poolState.tokens.map((t) => {
            if (t.underlyingToken) {
                return t.underlyingToken;
            }
            return {
                address: t.address,
                decimals: t.decimals,
                index: t.index,
            };
        });

        switch (input.kind) {
            case AddLiquidityKind.Unbalanced: {
                // It is allowed not not provide the same amount of TokenAmounts as inputs
                // as the pool has tokens, in this case, the input tokens are filled with
                // a default value ( 0 in this case ) to assure correct amounts in as the pool has tokens.
                const sortedTokens = getSortedTokens(
                    childTokens,
                    input.chainId,
                );
                const maxAmountsIn = getAmounts(sortedTokens, input.amountsIn);

                const bptAmountOut = await doAddLiquidityUnbalancedQuery(
                    input.rpcUrl,
                    input.chainId,
                    input.sender ?? zeroAddress,
                    input.userData ?? '0x',
                    poolState.address,
                    input.wrapUnderlying,
                    maxAmountsIn,
                    block,
                );

                bptOut = TokenAmount.fromRawAmount(bptToken, bptAmountOut);
                amountsIn = sortedTokens.map((t, i) =>
                    TokenAmount.fromRawAmount(t, maxAmountsIn[i]),
                );
                break;
            }
            case AddLiquidityKind.Proportional: {
                const bptAmount = await getBptAmountFromReferenceAmountBoosted(
                    input,
                    poolState,
                );

                const exactAmountsInNumbers =
                    await doAddLiquidityProportionalQuery(
                        input.rpcUrl,
                        input.chainId,
                        input.sender ?? zeroAddress,
                        input.userData ?? '0x',
                        poolState.address,
                        bptAmount.rawAmount,
                        input.wrapUnderlying,
                        block,
                    );

                // Amounts are mapped to child tokens of the pool
                amountsIn = childTokens.map((t, i) =>
                    TokenAmount.fromRawAmount(
                        new Token(input.chainId, t.address, t.decimals),
                        exactAmountsInNumbers[i],
                    ),
                );

                bptOut = TokenAmount.fromRawAmount(
                    bptToken,
                    bptAmount.rawAmount,
                );
                break;
            }
        }

        const output: AddLiquidityBoostedQueryOutput = {
            poolId: poolState.id,
            poolType: poolState.type,
            addLiquidityKind: input.kind,
            wrapUnderlying: input.wrapUnderlying,
            bptOut,
            amountsIn,
            chainId: input.chainId,
            protocolVersion: 3,
            userData: input.userData ?? '0x',
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[input.chainId],
        };

        return output;
    }

    buildCall(
        input: AddLiquidityBoostedBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);
        const wethIsEth = input.wethIsEth ?? false;
        const args = [
            input.poolId,
            input.wrapUnderlying,
            amounts.maxAmountsIn,
            amounts.minimumBpt,
            wethIsEth,
            input.userData,
        ] as const;
        let callData: Hex;
        switch (input.addLiquidityKind) {
            case AddLiquidityKind.Unbalanced: {
                callData = encodeFunctionData({
                    abi: balancerCompositeLiquidityRouterBoostedAbi,
                    functionName: 'addLiquidityUnbalancedToERC4626Pool',
                    args,
                });
                break;
            }
            case AddLiquidityKind.Proportional: {
                callData = encodeFunctionData({
                    abi: balancerCompositeLiquidityRouterBoostedAbi,
                    functionName: 'addLiquidityProportionalToERC4626Pool',
                    args,
                });
                break;
            }
            case AddLiquidityKind.SingleToken: {
                throw new Error('SingleToken not supported');
            }
        }

        const value = getValue(input.amountsIn, wethIsEth);

        return {
            callData,
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[input.chainId],
            value,
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
