import { encodeFunctionData } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';

import { Permit2 } from '@/entities/permit2Helper';

import { doInitBufferQuery } from './doInitBufferQuery';
import { BALANCER_BUFFER_ROUTER } from '@/utils';
import {
    balancerBufferRouterAbiExtended,
    balancerRouterAbiExtended,
} from '@/abi';

import {
    InitBufferBuildCallInput,
    InitBufferBuildCallOutput,
    InitBufferInput,
    InitBufferQueryOutput,
} from './types';

export class InitBufferV3 {
    async query(input: InitBufferInput): Promise<InitBufferQueryOutput> {
        const { issuedShares } = await doInitBufferQuery(
            input.rpcUrl,
            input.chainId,
            input.wrappedAmountIn.address,
            input.underlyingAmountIn.rawAmount,
            input.wrappedAmountIn.rawAmount,
        );
        const underlyingAmountIn = TokenAmount.fromInputAmount(
            input.underlyingAmountIn,
            input.chainId,
        );
        const wrappedAmountIn = TokenAmount.fromInputAmount(
            input.wrappedAmountIn,
            input.chainId,
        );

        const output: InitBufferQueryOutput = {
            issuedShares,
            underlyingAmountIn,
            wrappedAmountIn,
            chainId: input.chainId,
            protocolVersion: 3,
            to: BALANCER_BUFFER_ROUTER[input.chainId],
        };

        return output;
    }

    buildCall(input: InitBufferBuildCallInput): InitBufferBuildCallOutput {
        const minIssuedShares = input.slippage.applyTo(input.issuedShares, -1);

        const callData = encodeFunctionData({
            abi: balancerBufferRouterAbiExtended,
            functionName: 'initializeBuffer',
            args: [
                input.wrappedAmountIn.token.address,
                input.underlyingAmountIn.amount,
                input.wrappedAmountIn.amount,
                minIssuedShares,
            ] as const,
        });
        return {
            callData,
            to: BALANCER_BUFFER_ROUTER[input.chainId],
            value: 0n, // Default to 0 as native not supported
            minIssuedShares,
        };
    }

    public buildCallWithPermit2(
        input: InitBufferBuildCallInput,
        permit2: Permit2,
    ): InitBufferBuildCallOutput {
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
