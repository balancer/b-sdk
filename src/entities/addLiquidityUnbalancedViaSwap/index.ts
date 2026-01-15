import { encodeFunctionData, maxUint256, zeroAddress } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';
import { Token } from '@/entities/token';
import { PoolState } from '@/entities/types';
import { Permit2 } from '@/entities/permit2Helper';
import {
    balancerUnbalancedAddViaSwapRouterAbiExtended,
    balancerRouterAbiExtended,
} from '@/abi';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import {
    getValue,
    getSortedTokens,
    getBptAmountFromReferenceAmount,
} from '@/entities/utils';
import { doAddLiquidityUnbalancedViaSwapQuery } from './doAddLiquidityUnbalancedViaSwapQuery';
import { validateAddLiquidityUnbalancedViaSwapInput } from './validateInputs';
import { getAmountsCallUnbalancedViaSwap } from './helpers';
import {
    AddLiquidityUnbalancedViaSwapInput,
    AddLiquidityUnbalancedViaSwapQueryOutput,
    AddLiquidityUnbalancedViaSwapBuildCallInput,
    AddLiquidityUnbalancedViaSwapBuildCallOutput,
} from './types';
import { queryAndAdjustBptAmount } from '../utils/unbalancedJoinViaSwapHelpers';
import { SDKError } from '@/utils/errors';
import { AddLiquidityKind } from '../addLiquidity/types';

// Export types
export type {
    AddLiquidityUnbalancedViaSwapInput,
    AddLiquidityUnbalancedViaSwapQueryOutput,
    AddLiquidityUnbalancedViaSwapBuildCallInput,
    AddLiquidityUnbalancedViaSwapBuildCallOutput,
} from './types';

export class AddLiquidityUnbalancedViaSwapV3 {
    async query(
        input: AddLiquidityUnbalancedViaSwapInput,
        poolState: PoolState,
        block?: bigint,
    ): Promise<AddLiquidityUnbalancedViaSwapQueryOutput> {
        validateAddLiquidityUnbalancedViaSwapInput(input, poolState);

        const sender = input.sender ?? zeroAddress;
        const addLiquidityUserData = input.addLiquidityUserData ?? '0x';
        const swapUserData = input.swapUserData ?? '0x';

        // Convert input amounts to TokenAmount objects
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amountsIn = sortedTokens.map((token) => {
            const inputAmount = input.amountsIn.find(
                (amount) =>
                    amount.address.toLowerCase() ===
                    token.address.toLowerCase(),
            );
            if (!inputAmount) {
                throw new Error(`Token amount not found for ${token.address}`);
            }
            return TokenAmount.fromRawAmount(token, inputAmount.rawAmount);
        });

        // Use the provided exact token index
        const exactTokenIndex = input.exactTokenIndex;
        const adjustableTokenIndex = exactTokenIndex === 0 ? 1 : 0;
        const exactToken = amountsIn[exactTokenIndex].token.address;

        if (
            input.amountsIn[exactTokenIndex].rawAmount > 0n &&
            input.amountsIn[adjustableTokenIndex].rawAmount === 0n
        ) {
            throw new SDKError(
                'UnbalancedJoinViaSwap',
                'AddLiquidityUnbalancedViaSwapV3.query',
                'Single-sided joins with maxAdjustableAmount = 0 are not supported by UnbalancedAddViaSwapRouter. Please provide a non-zero adjustable amount or use a different path.',
            );
        }
        if (
            input.amountsIn[exactTokenIndex].rawAmount === 0n &&
            input.amountsIn[adjustableTokenIndex].rawAmount > 0n
        ) {
            // Single-sided add liquidity: exact token amount is zero,
            // adjustable token has a finite budget.
            // We treat the adjustable token as the reference and derive a BPT
            // target from it.

            const maxAjustableTokenAmount = amountsIn[adjustableTokenIndex];

            // Initial guess is 50% of the provided maxAjustableAmountIn.
            // It should result close to the desired bptAmount when
            // centeredness = 1 and result in a smaller bptAmount than the
            // desired when centeredness decreases.
            const initialReferenceAmount = maxAjustableTokenAmount.amount / 2n;

            const initialBptAmount = await getBptAmountFromReferenceAmount(
                {
                    chainId: input.chainId,
                    rpcUrl: input.rpcUrl,
                    referenceAmount: {
                        address: maxAjustableTokenAmount.token.address,
                        rawAmount: initialReferenceAmount,
                        decimals: maxAjustableTokenAmount.token.decimals,
                    },
                    kind: AddLiquidityKind.Proportional,
                },
                poolState,
            );

            // First iteration to adjust bptAmount will overcorrect, resulting in
            // an adjustedBptAmount greater than the desired output
            const adjustedBptAmount = await queryAndAdjustBptAmount(
                input.rpcUrl,
                input.chainId,
                input.pool,
                sender,
                initialBptAmount.rawAmount,
                exactToken,
                0n,
                maxUint256,
                addLiquidityUserData,
                swapUserData,
                adjustableTokenIndex,
                maxAjustableTokenAmount.amount,
                block,
            );

            // Second iteration to get closer to the desired output from below.
            // This ensures the result will favor leaving some dust behind instead
            // of risking a revert by returning a finalBptAmount corresponding to
            // a maxAdjustableAmount smaller than the amountIn provided by the user.
            const finalBptAmount = await queryAndAdjustBptAmount(
                input.rpcUrl,
                input.chainId,
                input.pool,
                sender,
                adjustedBptAmount,
                exactToken,
                0n,
                maxUint256,
                addLiquidityUserData,
                swapUserData,
                adjustableTokenIndex,
                maxAjustableTokenAmount.amount,
                block,
            );

            const calculatedAmountsIn =
                await doAddLiquidityUnbalancedViaSwapQuery(
                    input.rpcUrl,
                    input.chainId,
                    input.pool,
                    sender,
                    finalBptAmount,
                    exactToken,
                    0n,
                    maxUint256,
                    addLiquidityUserData,
                    swapUserData,
                    block,
                );

            const finalAmountsIn = sortedTokens.map((token, index) =>
                TokenAmount.fromRawAmount(token, calculatedAmountsIn[index]),
            );

            const bptToken = new Token(input.chainId, poolState.address, 18);
            const bptOut = TokenAmount.fromRawAmount(bptToken, finalBptAmount);

            const output: AddLiquidityUnbalancedViaSwapQueryOutput = {
                pool: input.pool,
                bptOut,
                amountsIn: finalAmountsIn,
                chainId: input.chainId,
                protocolVersion: 3,
                to: AddressProvider.Router(input.chainId),
                addLiquidityUserData,
                swapUserData,
                exactToken,
                exactAmount: 0n,
                adjustableTokenIndex,
            };
            return output;
        }

        // TODO: check if the approach works for the generalized unbalanced case
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'AddLiquidityUnbalancedViaSwapV3.query',
            'Two-token joins are not supported by The SDK yet. Please provide a single-sided join.',
        );
    }

    buildCall(
        input: AddLiquidityUnbalancedViaSwapBuildCallInput,
    ): AddLiquidityUnbalancedViaSwapBuildCallOutput {
        const amounts = getAmountsCallUnbalancedViaSwap(input);
        const wethIsEth = input.wethIsEth ?? false;

        const callData = encodeFunctionData({
            abi: balancerUnbalancedAddViaSwapRouterAbiExtended,
            functionName: 'addLiquidityUnbalanced',
            args: [
                input.pool,
                input.deadline,
                wethIsEth,
                {
                    exactBptAmountOut: amounts.exactBptAmountOut,
                    exactToken: input.exactToken,
                    exactAmount: input.exactAmount,
                    maxAdjustableAmount: amounts.maxAdjustableAmount,
                    addLiquidityUserData: input.addLiquidityUserData,
                    swapUserData: input.swapUserData,
                },
            ] as const,
        });

        const value = getValue(input.amountsIn, wethIsEth);
        const exactBptAmountOut = TokenAmount.fromRawAmount(
            input.bptOut.token,
            amounts.exactBptAmountOut,
        );
        const maxAdjustableAmount = TokenAmount.fromRawAmount(
            input.amountsIn[input.adjustableTokenIndex].token,
            amounts.maxAdjustableAmount,
        );

        return {
            callData,
            to: AddressProvider.UnbalancedAddViaSwapRouter(input.chainId),
            value,
            exactBptAmountOut,
            maxAdjustableAmount,
        };
    }

    public buildCallWithPermit2(
        input: AddLiquidityUnbalancedViaSwapBuildCallInput,
        permit2: Permit2,
    ): AddLiquidityUnbalancedViaSwapBuildCallOutput {
        // Generate same calldata as buildCall
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
