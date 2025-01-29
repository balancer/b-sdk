// A user can add liquidity to a boosted pool in various forms. The following ways are
// available:
// 1. Unbalanced - addLiquidityUnbalancedToERC4626Pool
// 2. Proportional - addLiquidityProportionalToERC4626Pool
import { encodeFunctionData, zeroAddress, Address } from 'viem';
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

import { Hex } from '@/types';
import {
    AddLiquidityBoostedBuildCallInput,
    AddLiquidityBoostedInput,
    AddLiquidityBoostedQueryOutput,
} from './types';
import { InputValidator } from '../inputValidator/inputValidator';
import { MinimalToken } from '@/data/types';

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
        const wrapUnderlying: boolean[] = [];

        let bptOut: TokenAmount;
        let amountsIn: TokenAmount[];

        type ExtendedMinimalToken = MinimalToken & {
            isUnderlyingToken: boolean;
        };

        // Build a useful map of all pool tokens with an isUnderlyingToken flag
        const poolStateTokenMap: Record<Address, ExtendedMinimalToken> = {};
        poolState.tokens.forEach((t) => {
            const underlyingToken = t.underlyingToken;
            poolStateTokenMap[t.address.toLowerCase()] = {
                index: t.index,
                decimals: t.decimals,
                address: t.address,
                isUnderlyingToken: false,
            };
            if (underlyingToken) {
                poolStateTokenMap[underlyingToken.address.toLowerCase()] = {
                    index: underlyingToken.index,
                    decimals: underlyingToken.decimals,
                    address: underlyingToken.address,
                    isUnderlyingToken: true,
                };
            }
        });

        switch (input.kind) {
            case AddLiquidityKind.Unbalanced: {
                // Infer wrapUnderlying from token addreses provided by amountsIn
                const tokensIn: ExtendedMinimalToken[] = input.amountsIn
                    .map((amountIn) => {
                        const amountInAddress = amountIn.address.toLowerCase();
                        const token = poolStateTokenMap[amountInAddress];
                        if (!token) {
                            throw new Error(
                                `Token not found in poolState: ${amountInAddress}`,
                            );
                        }
                        return token;
                    })
                    .sort((a, b) => a.index - b.index); // sort by index so wrapUnderlying is in correct order

                tokensIn.forEach((t) => {
                    wrapUnderlying.push(t.isUnderlyingToken);
                });

                // It is allowed not not provide the same amount of TokenAmounts as inputs
                // as the pool has tokens, in this case, the input tokens are filled with
                // a default value ( 0 in this case ) to assure correct amounts in as the pool has tokens.
                const sortedTokens = getSortedTokens(tokensIn, input.chainId);
                const maxAmountsIn = getAmounts(sortedTokens, input.amountsIn);

                const bptAmountOut = await doAddLiquidityUnbalancedQuery(
                    input.rpcUrl,
                    input.chainId,
                    input.sender ?? zeroAddress,
                    input.userData ?? '0x',
                    poolState.address,
                    wrapUnderlying,
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
                // User provides tokensIn addresses so we can infer if they need to be wrapped

                const sortedTokensInWithDetails = input.tokensIn
                    .map((t) => {
                        const tokenWithDetails =
                            poolStateTokenMap[t.toLowerCase() as Address];
                        if (!tokenWithDetails) {
                            throw new Error(`Invalid token address: ${t}`);
                        }
                        return tokenWithDetails;
                    })
                    .sort((a, b) => a.index - b.index);

                sortedTokensInWithDetails.forEach((t) => {
                    wrapUnderlying.push(t.isUnderlyingToken);
                });

                const bptAmount = await getBptAmountFromReferenceAmountBoosted(
                    input,
                    poolState,
                    wrapUnderlying,
                );

                const [tokensIn, exactAmountsInNumbers] =
                    await doAddLiquidityProportionalQuery(
                        input.rpcUrl,
                        input.chainId,
                        input.sender ?? zeroAddress,
                        input.userData ?? '0x',
                        poolState.address,
                        bptAmount.rawAmount,
                        wrapUnderlying,
                        block,
                    );

                amountsIn = tokensIn.map((tokenInAddress, i) => {
                    const decimals = poolState.tokens.find((t) => {
                        const tokenAddress = tokenInAddress.toLowerCase();
                        return (
                            t.address.toLowerCase() === tokenAddress ||
                            (t.underlyingToken &&
                                t.underlyingToken.address.toLowerCase() ===
                                    tokenAddress)
                        );
                    })?.decimals;

                    if (!decimals)
                        throw new Error(
                            `Token decimals missing for ${tokenInAddress}`,
                        );

                    const token = new Token(
                        input.chainId,
                        tokenInAddress,
                        decimals,
                    );

                    return TokenAmount.fromRawAmount(
                        token,
                        exactAmountsInNumbers[i],
                    );
                });

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
            wrapUnderlying,
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
