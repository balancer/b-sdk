import { encodeFunctionData, zeroAddress } from 'viem';

import {
    RemoveLiquidityBase,
    RemoveLiquidityBaseQueryOutput,
    RemoveLiquidityBoostedQueryOutput,
    RemoveLiquidityKind,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityBaseBuildCallInput,
    RemoveLiquidityQueryOutput,
    RemoveLiquidityRecoveryInput,
    RemoveLiquidityProportionalInputWithOptionalUserArgs,
    RemoveLiquidityProportionalInputWithUserArgs,
} from '../removeLiquidity/types';

import { Permit } from '@/entities/permitHelper';

import { balancerCompositeLiquidityRouterAbi } from '@/abi';

import { PoolState, PoolStateWithUnderlyings } from '@/entities/types';

import { TokenAmount } from '@/entities/tokenAmount';
import { Token } from '@/entities/token';

import { getAmountsCall } from '../removeLiquidity/helper';

import { doRemoveLiquidityProportionalQuery } from './doRemoveLiquidityProportionalQuery';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER } from '@/utils';

export class RemoveLiquidityBoostedV3 implements RemoveLiquidityBase {
    public async queryRemoveLiquidityRecovery(
        _input: RemoveLiquidityRecoveryInput,
        _poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        throw new Error('Not implemented');
    }
    public async query(
        input: RemoveLiquidityProportionalInputWithOptionalUserArgs,
        poolState: PoolStateWithUnderlyings,
    ): Promise<RemoveLiquidityBoostedQueryOutput> {
        // Check if userAddress and userData were provided, and assign default values if not
        if (!('userAddress' in input) || input.userAddress === undefined) {
            // TODO: I think using a random address might be better than using the 0 address.
            input.userAddress = '0x0000000000000000000000000000000000000000';
        }
        if (!('userData' in input) || input.userData === undefined) {
            input.userData = '0x';
        }

        const amountsOutInNumbers = await doRemoveLiquidityProportionalQuery(
            input as RemoveLiquidityProportionalInputWithUserArgs,
            poolState.address,
        );

        // amountsOut are in underlying Tokens.
        const amountsOut = amountsOutInNumbers.map((amount, i) => {
            const token = new Token(
                input.chainId,
                poolState.tokens[i].address,
                poolState.tokens[i].decimals,
            );
            return TokenAmount.fromRawAmount(token, amount);
        });

        const bptToken = new Token(input.chainId, poolState.address, 18);

        const output: RemoveLiquidityBoostedQueryOutput = {
            poolType: poolState.type,
            poolId: poolState.address,
            removeLiquidityKind: RemoveLiquidityKind.Proportional,
            bptIn: TokenAmount.fromRawAmount(bptToken, input.bptIn.rawAmount),
            amountsOut: amountsOut,
            protocolVersion: poolState.protocolVersion,
            chainId: input.chainId,
            userData: input.userData ?? '0x',
        };
        return output;
    }
    public buildCall(
        input: RemoveLiquidityBaseBuildCallInput,
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
                false,
                '0x',
            ],
        });

        return {
            callData: callData,
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[input.chainId],
            value: 0n, // always has 0 value
            maxBptIn: input.bptIn, //TokenAmount
            minAmountsOut: amounts.minAmountsOut.map((amounts, i) => {
                return TokenAmount.fromRawAmount(
                    input.amountsOut[i].token,
                    amounts,
                );
            }),
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
