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
import { Token } from '@/entities/token';
import { balancerV3Contracts, protocolVersionError } from '@/utils';
import {
    balancerCompositeLiquidityRouterBoostedAbiExtended,
    balancerRouterAbiExtended,
} from '@/abi';
import { Hex } from '@/types';
import {
    AddLiquidityBoostedBuildCallInput,
    AddLiquidityBoostedInput,
    AddLiquidityBoostedQueryOutput,
} from './types';
import { InputValidator } from '../inputValidator/inputValidator';
import {
    buildPoolStateTokenMap,
    MinimalTokenWithIsUnderlyingFlag,
} from '@/entities/utils';

import { AddressProvider } from '../inputValidator/utils/addressProvider';

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
        const wrapUnderlying: boolean[] = new Array(
            poolState.tokens.length,
        ).fill(false);

        let bptOut: TokenAmount;
        let amountsIn: TokenAmount[];

        const poolStateTokenMap = buildPoolStateTokenMap(poolState);

        switch (input.kind) {
            case AddLiquidityKind.Unbalanced: {
                // Use amountsIn provided by use to infer if token should be wrapped
                const tokensIn: MinimalTokenWithIsUnderlyingFlag[] =
                    input.amountsIn.map((amountIn) => {
                        const amountInAddress =
                            amountIn.address.toLowerCase() as Address;
                        // input validation already verifies that token is in poolState
                        const token = poolStateTokenMap[amountInAddress];
                        return token;
                    });

                // if user provides fewer than the number of pool tokens,
                // fill remaining indexes because composite router requires
                // length of pool tokens to match maxAmountsIn and wrapUnderlying
                if (tokensIn.length < poolState.tokens.length) {
                    const existingIndices = new Set(
                        tokensIn.map((t) => t.index),
                    );
                    poolState.tokens.forEach((poolToken) => {
                        if (!existingIndices.has(poolToken.index)) {
                            tokensIn.push({
                                index: poolToken.index,
                                decimals: poolToken.decimals,
                                address: poolToken.address,
                                isUnderlyingToken: false,
                            });
                        }
                    });
                }

                // wrap if token is underlying
                tokensIn.forEach((t) => {
                    wrapUnderlying[t.index] = t.isUnderlyingToken;
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
                // User provides addresses via input.tokensIn so we can infer if they need to be wrapped
                input.tokensIn.forEach((t) => {
                    const tokenIn =
                        poolStateTokenMap[t.toLowerCase() as Address];
                    wrapUnderlying[tokenIn.index] = tokenIn.isUnderlyingToken;
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

                amountsIn = tokensIn.map((t, i) => {
                    const tokenInAddress = t.toLowerCase() as Address;
                    const { decimals } = poolStateTokenMap[tokenInAddress];
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
            to: AddressProvider.CompositeLiquidityRouter(input.chainId),
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
                    abi: balancerCompositeLiquidityRouterBoostedAbiExtended,
                    functionName: 'addLiquidityUnbalancedToERC4626Pool',
                    args,
                });
                break;
            }
            case AddLiquidityKind.Proportional: {
                callData = encodeFunctionData({
                    abi: balancerCompositeLiquidityRouterBoostedAbiExtended,
                    functionName: 'addLiquidityProportionalToERC4626Pool',
                    args,
                });
                break;
            }
            case AddLiquidityKind.SingleToken: {
                throw protocolVersionError(
                    'Add Liquidity Boosted Single Token',
                    input.protocolVersion,
                );
            }
        }

        const value = getValue(input.amountsIn, wethIsEth);

        return {
            callData,
            to: AddressProvider.CompositeLiquidityRouter(input.chainId),
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
