import { encodeFunctionData, zeroAddress } from 'viem';

import {
    RemoveLiquidityBase,
    RemoveLiquidityKind,
    RemoveLiquidityBuildCallOutput,
} from '../removeLiquidity/types';

import { Permit } from '@/entities/permitHelper';

import { balancerCompositeLiquidityRouterAbi } from '@/abi';

import { PoolStateWithUnderlyings } from '@/entities/types';

import { TokenAmount } from '@/entities/tokenAmount';
import { Token } from '@/entities/token';

import { getAmountsCall } from '../removeLiquidity/helper';

import { doRemoveLiquidityProportionalQuery } from './doRemoveLiquidityProportionalQuery';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER } from '@/utils';
import {
    RemoveLiquidityBoostedBuildCallInput,
    RemoveLiquidityBoostedProportionalInput,
    RemoveLiquidityBoostedQueryOutput,
} from './types';
import { InputValidator } from '../inputValidator/inputValidator';
import { getSortedTokens } from '../utils';

export class RemoveLiquidityBoostedV3 implements RemoveLiquidityBase {
    private readonly inputValidator: InputValidator = new InputValidator();

    public async query(
        input: RemoveLiquidityBoostedProportionalInput,
        poolState: PoolStateWithUnderlyings,
    ): Promise<RemoveLiquidityBoostedQueryOutput> {
        this.inputValidator.validateRemoveLiquidity(input, {
            ...poolState,
            type: 'Boosted',
        });
        const underlyingAmountsOut = await doRemoveLiquidityProportionalQuery(
            input.rpcUrl,
            input.chainId,
            input.bptIn.rawAmount,
            input.sender ?? zeroAddress,
            input.userData ?? '0x',
            poolState.address,
        );

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

        const sortedChildTokens = getSortedTokens(childTokens, input.chainId);

        // amountsOut are in child tokens sorted in token registration order of wrapped tokens in the pool
        const amountsOut = underlyingAmountsOut.map((amount, i) => {
            const token = new Token(
                input.chainId,
                sortedChildTokens[i].address,
                sortedChildTokens[i].decimals,
            );
            return TokenAmount.fromRawAmount(token, amount);
        });

        const bptToken = new Token(input.chainId, poolState.address, 18);

        const output: RemoveLiquidityBoostedQueryOutput = {
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[input.chainId],
            poolType: poolState.type,
            poolId: poolState.address,
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
            abi: balancerCompositeLiquidityRouterAbi,
            functionName: 'removeLiquidityProportionalFromERC4626Pool',
            args: [
                input.poolId,
                input.bptIn.amount,
                amounts.minAmountsOut,
                input.wethIsEth ?? false,
                input.userData,
            ],
        });

        return {
            callData: callData,
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[input.chainId],
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
            abi: balancerCompositeLiquidityRouterAbi,
            functionName: 'permitBatchAndCall',
            args,
        });

        return {
            ...buildCallOutput,
            callData,
        };
    }
}
