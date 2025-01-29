import { Address, encodeFunctionData, zeroAddress } from 'viem';

import {
    RemoveLiquidityBase,
    RemoveLiquidityKind,
    RemoveLiquidityBuildCallOutput,
} from '../removeLiquidity/types';

import { Permit } from '@/entities/permitHelper';

import { balancerCompositeLiquidityRouterBoostedAbi } from '@/abi';

import { PoolStateWithUnderlyings } from '@/entities/types';

import { TokenAmount } from '@/entities/tokenAmount';
import { Token } from '@/entities/token';

import { getAmountsCall } from '../removeLiquidity/helper';

import { doRemoveLiquidityProportionalQuery } from './doRemoveLiquidityProportionalQuery';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED } from '@/utils';
import {
    RemoveLiquidityBoostedBuildCallInput,
    RemoveLiquidityBoostedProportionalInput,
    RemoveLiquidityBoostedQueryOutput,
} from './types';
import { InputValidator } from '../inputValidator/inputValidator';
import { MinimalToken } from '@/data';

export class RemoveLiquidityBoostedV3 implements RemoveLiquidityBase {
    private readonly inputValidator: InputValidator = new InputValidator();

    public async query(
        input: RemoveLiquidityBoostedProportionalInput,
        poolState: PoolStateWithUnderlyings,
        block?: bigint,
    ): Promise<RemoveLiquidityBoostedQueryOutput> {
        this.inputValidator.validateRemoveLiquidity(input, {
            ...poolState,
            type: 'Boosted',
        });

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

        const sortedTokensOutWithDetails = input.tokensOut
            .map((t) => {
                const tokenWithDetails =
                    poolStateTokenMap[t.toLowerCase() as Address];
                if (!tokenWithDetails) {
                    throw new Error(`Invalid token address: ${t}`);
                }
                return tokenWithDetails;
            })
            .sort((a, b) => a.index - b.index);

        const unwrapWrapped: boolean[] = sortedTokensOutWithDetails.map(
            (t) => t.isUnderlyingToken,
        );

        const [tokensOut, underlyingAmountsOut] =
            await doRemoveLiquidityProportionalQuery(
                input.rpcUrl,
                input.chainId,
                input.bptIn.rawAmount,
                input.sender ?? zeroAddress,
                input.userData ?? '0x',
                poolState.address,
                unwrapWrapped,
                block,
            );

        // tokens out can be underlying or yield-bearing variant
        const amountsOut = underlyingAmountsOut.map((amount, i) => {
            const tokenOut = tokensOut[i];

            const decimals = poolState.tokens.find((t) => {
                return (
                    t.address.toLowerCase() === tokenOut.toLowerCase() ||
                    (t.underlyingToken &&
                        t.underlyingToken.address.toLowerCase() ===
                            tokenOut.toLowerCase())
                );
            })?.decimals;

            if (!decimals)
                throw new Error(`Token decimals missing for ${tokenOut}`);

            const token = new Token(input.chainId, tokenOut, decimals);
            return TokenAmount.fromRawAmount(token, amount);
        });

        const bptToken = new Token(input.chainId, poolState.address, 18);

        const output: RemoveLiquidityBoostedQueryOutput = {
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[input.chainId],
            poolType: poolState.type,
            poolId: poolState.address,
            unwrapWrapped,
            removeLiquidityKind: RemoveLiquidityKind.Proportional,
            bptIn: TokenAmount.fromRawAmount(bptToken, input.bptIn.rawAmount),
            amountsOut,
            protocolVersion: 3,
            chainId: input.chainId,
            userData: input.userData ?? '0x',
        };
        return output;
    }

    public buildCall(
        input: RemoveLiquidityBoostedBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        // Apply slippage to amounts shared in put depending on the kind
        // In this case, the user is willing to accept a slightly lower
        // amount of tokens out, depending on slippage
        const amounts = getAmountsCall(input);

        const callData = encodeFunctionData({
            abi: balancerCompositeLiquidityRouterBoostedAbi,
            functionName: 'removeLiquidityProportionalFromERC4626Pool',
            args: [
                input.poolId,
                input.unwrapWrapped,
                input.bptIn.amount,
                amounts.minAmountsOut,
                input.wethIsEth ?? false,
                input.userData,
            ],
        });

        return {
            callData: callData,
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED[input.chainId],
            value: 0n, // always has 0 value
            maxBptIn: input.bptIn,
            minAmountsOut: amounts.minAmountsOut.map((amount, i) => {
                return TokenAmount.fromRawAmount(
                    input.amountsOut[i].token,
                    amount,
                );
            }),
        };
    }

    public buildCallWithPermit(
        input: RemoveLiquidityBoostedBuildCallInput,
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
            abi: balancerCompositeLiquidityRouterBoostedAbi,
            functionName: 'permitBatchAndCall',
            args,
        });

        return {
            ...buildCallOutput,
            callData,
        };
    }
}
