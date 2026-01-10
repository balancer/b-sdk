import { encodeFunctionData, zeroAddress } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';
import { Token } from '@/entities/token';
import { PoolState } from '@/entities/types';
import { Permit2 } from '@/entities/permit2Helper';
import {
    balancerUnbalancedAddViaSwapRouterAbiExtended,
    balancerRouterAbiExtended,
} from '@/abi';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { getValue, getSortedTokens } from '@/entities/utils';
import { Hex, Address, InputAmount } from '@/types';
import { doAddLiquidityUnbalancedViaSwapQuery } from './doAddLiquidityUnbalancedViaSwapQuery';
import { validateAddLiquidityUnbalancedViaSwapInput } from './validateInputs';
import { getAmountsCallUnbalancedViaSwap } from './helpers';
import {
    AddLiquidityUnbalancedViaSwapInput,
    AddLiquidityUnbalancedViaSwapQueryOutput,
    AddLiquidityUnbalancedViaSwapBuildCallInput,
    AddLiquidityUnbalancedViaSwapBuildCallOutput,
} from './types';
import { getBptAmountFromReferenceAmountnbalancedViaSwapFromAdjustableAmount } from '../utils/unbalancedJoinViaSwapHelpers';
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
            // Single-sided join: exact token amount is zero, adjustable token has a finite budget.
            // We treat the adjustable token as the reference and derive a BPT target from it.

            const adjustableBudgetRaw = amountsIn[adjustableTokenIndex].amount;

            const bptAmount =
                await getBptAmountFromReferenceAmountnbalancedViaSwapFromAdjustableAmount(
                    {
                        chainId: input.chainId,
                        rpcUrl: input.rpcUrl,
                        referenceAmount: {
                            address:
                                amountsIn[adjustableTokenIndex].token.address,
                            rawAmount: adjustableBudgetRaw,
                            decimals:
                                amountsIn[adjustableTokenIndex].token.decimals,
                        },
                        kind: AddLiquidityKind.Proportional,
                        maxAdjustableAmountRaw: adjustableBudgetRaw,
                    },
                    poolState,
                );

            const bptToken = new Token(input.chainId, poolState.address, 18);
            const bptOut = TokenAmount.fromRawAmount(
                bptToken,
                bptAmount.rawAmount,
            );

            // Query the router with exactAmount = 0 and maxAdjustableAmount = adjustableBudgetRaw.
            const amountsInNumbers = await doAddLiquidityUnbalancedViaSwapQuery(
                input.rpcUrl,
                input.chainId,
                input.pool,
                sender,
                bptAmount.rawAmount,
                exactToken,
                0n,
                adjustableBudgetRaw,
                addLiquidityUserData,
                swapUserData,
                block,
            );

            const finalAmountsIn = sortedTokens.map((token, index) =>
                TokenAmount.fromRawAmount(token, amountsInNumbers[index]),
            );

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
        // Two token join - currently not supported
        throw new SDKError(
            'UnbalancedJoinViaSwap',
            'AddLiquidityUnbalancedViaSwapV3.query',
            'Two-token joins are not supported by The SDK yet. Please provide a single-sided join.',
        );
    }

    buildCall(
        input: AddLiquidityUnbalancedViaSwapBuildCallInput,
    ): AddLiquidityUnbalancedViaSwapBuildCallOutput {
        // the queryOutput returns the actual amountsIn for a calculated BPT amount.
        // the BPT amount is calculated based on a proportional join helper with some
        // inline bptAmount adjustments. (bpt gets increased by a certain percentage).
        // Simply using slippage to decrease the exactBptAmount would open up the
        // join with some freetom in the adjustable amount.
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
