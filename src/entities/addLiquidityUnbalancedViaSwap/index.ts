import { encodeFunctionData, maxUint256, parseEther, zeroAddress } from 'viem';
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

        const sender = input.sender ?? zeroAddress;
        const addLiquidityUserData = input.addLiquidityUserData ?? '0x';
        const swapUserData = input.swapUserData ?? '0x';

        // Convert pool state amounts to TokenAmount
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);

        const maxAdjustableTokenIndex = sortedTokens.findIndex((token) =>
            token.isSameAddress(input.maxAdjustableAmountIn.address),
        );

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
                    ...input.maxAdjustableAmountIn,
                    rawAmount: input.maxAdjustableAmountIn.rawAmount / 2n,
                },
                kind: AddLiquidityKind.Proportional,
            },
            poolState,
        );

        // First iteration to adjust bptAmount will overcorrect, resulting in
        // an adjustedBptAmount greater than the desired output
        const adjustedBptAmount = await queryAndAdjustBptAmount(
            input,
            poolState.address,
            initialBptAmount.rawAmount,
            maxAdjustableTokenIndex,
            block,
        );

        // Second iteration to get closer to the desired output from below.
        // This ensures the result will favor leaving some dust behind instead
        // of risking a revert by returning a finalBptAmount corresponding to
        // a maxAdjustableAmount smaller than the amountIn provided by the user.
        const finalBptAmount = await queryAndAdjustBptAmount(
            input,
            poolState.address,
            adjustedBptAmount,
            maxAdjustableTokenIndex,
            block,
        );

        const calculatedAmountsIn = await doAddLiquidityUnbalancedViaSwapQuery(
            input.rpcUrl,
            input.chainId,
            poolState.address,
            sender,
            finalBptAmount,
            input.exactAmountIn.address,
            0n,
            maxUint256,
            addLiquidityUserData,
            swapUserData,
            block,
        );

        const finalAmountsIn = sortedTokens.map((token, index) =>
            TokenAmount.fromRawAmount(token, calculatedAmountsIn[index]),
        );

        const calculatedVsProvidedRatio = MathSol.divDownFixed(
            finalAmountsIn[maxAdjustableTokenIndex].amount,
            input.maxAdjustableAmountIn.rawAmount,
        );

        if (calculatedVsProvidedRatio > WAD) {
            throw new SDKError(
                'Error',
                'Add Liquidity Unbalanced Via Swap',
                'Exact BPT out calculation failed. Please add a smaller or less unbalanced liquidity amount.',
            );
        }

        if (WAD - calculatedVsProvidedRatio > parseEther('0.01')) {
            console.warn(
                'Calculated amount for maxAdjustableAmountIn too low could result in too much dust left behind.',
            );
        }

        const bptToken = new Token(input.chainId, poolState.address, 18);
        const bptOut = TokenAmount.fromRawAmount(bptToken, finalBptAmount);

        const output: AddLiquidityUnbalancedViaSwapQueryOutput = {
            pool: poolState.address,
            bptOut,
            exactAmountIn: TokenAmount.fromInputAmount(
                input.exactAmountIn,
                input.chainId,
            ),
            maxAdjustableAmountIn: finalAmountsIn[maxAdjustableTokenIndex],
            chainId: input.chainId,
            protocolVersion: 3,
            to: AddressProvider.Router(input.chainId),
            addLiquidityUserData,
            swapUserData,
        };
        return output;
    }

    buildCall(
        input: AddLiquidityUnbalancedViaSwapBuildCallInput,
    ): AddLiquidityUnbalancedViaSwapBuildCallOutput {
        const exactBptAmountOut = TokenAmount.fromRawAmount(
            input.bptOut.token,
            input.slippage.applyTo(input.bptOut.amount, -1),
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
                    exactBptAmountOut: exactBptAmountOut.amount,
                    exactToken: input.exactAmountIn.token.address,
                    exactAmount: input.exactAmountIn.amount,
                    maxAdjustableAmount: input.maxAdjustableAmountIn.amount,
                    addLiquidityUserData: input.addLiquidityUserData,
                    swapUserData: input.swapUserData,
                },
            ] as const,
        });

        const value = getValue(
            [input.exactAmountIn, input.maxAdjustableAmountIn],
            wethIsEth,
        );

        return {
            callData,
            to: AddressProvider.UnbalancedAddViaSwapRouter(input.chainId),
            value,
            exactBptAmountOut,
            exactAmountIn: input.exactAmountIn,
            maxAdjustableAmountIn: input.maxAdjustableAmountIn,
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
