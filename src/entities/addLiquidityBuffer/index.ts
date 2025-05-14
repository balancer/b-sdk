import { encodeFunctionData } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';

import { Permit2 } from '@/entities/permit2Helper';

import { BufferState } from '@/entities/types';

import { doAddLiquidityQuery } from './doAddLiquidityQuery';
import { Token } from '../token';
import { balancerV3Contracts } from '@/utils';
import {
    balancerBufferRouterAbiExtended,
    balancerRouterAbiExtended,
} from '@/abi';

import {
    AddLiquidityBufferBuildCallInput,
    AddLiquidityBufferBuildCallOutput,
    AddLiquidityBufferInput,
    AddLiquidityBufferQueryOutput,
} from './types';

import { validateAddressExists } from '../inputValidator/utils/validateAddressExists';

export class AddLiquidityBufferV3 {
    async query(
        input: AddLiquidityBufferInput,
        bufferState: BufferState,
        block?: bigint,
    ): Promise<AddLiquidityBufferQueryOutput> {
        const { amountUnderlyingIn, amountWrappedIn } =
            await doAddLiquidityQuery(
                input.rpcUrl,
                input.chainId,
                bufferState.wrappedToken.address,
                input.exactSharesToIssue,
                block,
            );
        const underlyingToken = new Token(
            input.chainId,
            bufferState.underlyingToken.address,
            bufferState.underlyingToken.decimals,
        );
        const underlyingAmountIn = TokenAmount.fromRawAmount(
            underlyingToken,
            amountUnderlyingIn,
        );
        const wrappedToken = new Token(
            input.chainId,
            bufferState.wrappedToken.address,
            bufferState.wrappedToken.decimals,
        );
        const wrappedAmountIn = TokenAmount.fromRawAmount(
            wrappedToken,
            amountWrappedIn,
        );

        const output: AddLiquidityBufferQueryOutput = {
            exactSharesToIssue: input.exactSharesToIssue,
            underlyingAmountIn,
            wrappedAmountIn,
            chainId: input.chainId,
            protocolVersion: 3,
            to: validateAddressExists('BufferRouter', input.chainId, 3),
        };

        return output;
    }

    buildCall(
        input: AddLiquidityBufferBuildCallInput,
    ): AddLiquidityBufferBuildCallOutput {
        const maxUnderlyingAmountIn = TokenAmount.fromRawAmount(
            input.underlyingAmountIn.token,
            input.slippage.applyTo(input.underlyingAmountIn.amount),
        );
        const maxWrappedAmountIn = TokenAmount.fromRawAmount(
            input.wrappedAmountIn.token,
            input.slippage.applyTo(input.wrappedAmountIn.amount),
        );

        const callData = encodeFunctionData({
            abi: balancerBufferRouterAbiExtended,
            functionName: 'addLiquidityToBuffer',
            args: [
                input.wrappedAmountIn.token.address,
                maxUnderlyingAmountIn.amount,
                maxWrappedAmountIn.amount,
                input.exactSharesToIssue,
            ] as const,
        });
        return {
            callData,
            to: validateAddressExists('BufferRouter', input.chainId, 3),
            value: 0n, // Default to 0 as native not supported
            maxUnderlyingAmountIn,
            maxWrappedAmountIn,
            exactSharesToIssue: input.exactSharesToIssue,
        };
    }

    public buildCallWithPermit2(
        input: AddLiquidityBufferBuildCallInput,
        permit2: Permit2,
    ): AddLiquidityBufferBuildCallOutput {
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
