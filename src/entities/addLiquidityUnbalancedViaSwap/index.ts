import { encodeFunctionData, parseEther } from 'viem';
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
import { validateAddLiquidityUnbalancedViaSwapInput } from './validateInputs';
import {
    AddLiquidityUnbalancedViaSwapInput,
    AddLiquidityUnbalancedViaSwapQueryOutput,
    AddLiquidityUnbalancedViaSwapBuildCallInput,
    AddLiquidityUnbalancedViaSwapBuildCallOutput,
} from './types';
import { queryAndAdjustBptAmount } from '../utils/unbalancedAddViaSwapHelpers';
import { AddLiquidityKind } from '../addLiquidity/types';
import { MathSol, SDKError, WAD } from '@/utils';

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
        // Single-sided add liquidity: exact token amount is zero,
        // adjustable token has a finite budget.
        validateAddLiquidityUnbalancedViaSwapInput(input, poolState);

        // Convert pool state amounts to TokenAmount
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);

        const expectedAdjustableTokenIndex = sortedTokens.findIndex((token) =>
            token.isSameAddress(input.expectedAdjustableAmountIn.address),
        );
        const exactAmountTokenIndex =
            expectedAdjustableTokenIndex === 0 ? 1 : 0;

        // We treat the adjustable token as the reference and derive a BPT
        // target from it.

        // Initial guess is 50% of the provided maxAjustableAmountIn.
        // It should result close to the desired bptAmount when
        // centeredness = 1 and result in a smaller bptAmount than the
        // desired when centeredness decreases.
        const initialBptAmount = await getBptAmountFromReferenceAmount(
            {
                chainId: input.chainId,
                rpcUrl: input.rpcUrl,
                referenceAmount: {
                    ...input.expectedAdjustableAmountIn,
                    rawAmount: input.expectedAdjustableAmountIn.rawAmount / 2n,
                },
                kind: AddLiquidityKind.Proportional,
            },
            poolState,
        );

        // Iteratively adjust BPT amount until we find an approximation that:
        // 1. Is from below (calculated <= expected) to favor leaving dust
        // 2. Is within 0.1% tolerance of the expected adjustable amount
        const MAX_ITERATIONS = 4;
        const TOLERANCE = parseEther('0.001'); // 0.1%

        let currentBptAmount = initialBptAmount.rawAmount;
        let foundValidApproximation = false;

        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const { correctedBptAmount, calculatedAdjustableAmount } =
                await queryAndAdjustBptAmount(
                    input,
                    poolState.address,
                    currentBptAmount,
                    sortedTokens[exactAmountTokenIndex].address,
                    expectedAdjustableTokenIndex,
                    block,
                );

            // Check if current BPT amount produces a valid approximation:
            // - Must be from below (ratio <= 1) to avoid transaction reverts
            // - Must be within 0.1% tolerance
            const ratio = MathSol.divDownFixed(
                calculatedAdjustableAmount,
                input.expectedAdjustableAmountIn.rawAmount,
            );

            const isFromBelow = ratio <= WAD;
            const isWithinTolerance = WAD - ratio <= TOLERANCE;

            if (isFromBelow && isWithinTolerance) {
                foundValidApproximation = true;
                break;
            }

            // Not within tolerance yet, continue with corrected BPT amount
            currentBptAmount = correctedBptAmount;
        }

        if (!foundValidApproximation) {
            throw new SDKError(
                'Error',
                'Add Liquidity Unbalanced Via Swap',
                'Exact BPT out calculation failed. Please add a smaller (less unbalanced) amount.',
            );
        }

        const bptToken = new Token(input.chainId, poolState.address, 18);
        const bptOut = TokenAmount.fromRawAmount(bptToken, currentBptAmount);

        const output: AddLiquidityUnbalancedViaSwapQueryOutput = {
            pool: poolState.address,
            bptOut,
            exactAmountIn: TokenAmount.fromRawAmount(
                sortedTokens[exactAmountTokenIndex],
                0n,
            ),
            expectedAdjustableAmountIn: TokenAmount.fromInputAmount(
                input.expectedAdjustableAmountIn,
                input.chainId,
            ),
            chainId: input.chainId,
            protocolVersion: 3,
            to: AddressProvider.UnbalancedAddViaSwapRouter(input.chainId),
            addLiquidityUserData: input.addLiquidityUserData ?? '0x',
            swapUserData: input.swapUserData ?? '0x',
        };
        return output;
    }

    buildCall(
        input: AddLiquidityUnbalancedViaSwapBuildCallInput,
    ): AddLiquidityUnbalancedViaSwapBuildCallOutput {
        const maxAdjustableAmountIn = TokenAmount.fromRawAmount(
            input.expectedAdjustableAmountIn.token,
            input.slippage.applyTo(input.expectedAdjustableAmountIn.amount),
        );

        const wethIsEth = input.wethIsEth ?? false;

        const callData = encodeFunctionData({
            abi: balancerUnbalancedAddViaSwapRouterAbiExtended,
            functionName: 'addLiquidityUnbalanced',
            args: [
                input.pool,
                input.deadline,
                wethIsEth,
                {
                    exactBptAmountOut: input.bptOut.amount,
                    exactToken: input.exactAmountIn.token.address,
                    exactAmount: input.exactAmountIn.amount,
                    maxAdjustableAmount: maxAdjustableAmountIn.amount,
                    addLiquidityUserData: input.addLiquidityUserData,
                    swapUserData: input.swapUserData,
                },
            ] as const,
        });

        const value = getValue([maxAdjustableAmountIn], wethIsEth);

        return {
            callData,
            to: AddressProvider.UnbalancedAddViaSwapRouter(input.chainId),
            value,
            bptOut: input.bptOut,
            expectedAdjustableAmountIn: input.expectedAdjustableAmountIn,
            maxAdjustableAmountIn,
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
