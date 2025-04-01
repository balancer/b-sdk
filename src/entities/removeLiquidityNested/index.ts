import { NestedPoolState, Permit, Slippage } from '@/entities';
import { validateNestedPoolState } from '@/entities/utils';
import { RemoveLiquidityNestedV2 } from './removeLiquidityNestedV2';
import {
    RemoveLiquidityNestedInput,
    RemoveLiquidityNestedQueryOutput,
    RemoveLiquidityNestedCallInput,
    RemoveLiquidityNestedBuildCallOutput,
} from './types';
import { RemoveLiquidityNestedV3 } from './removeLiquidityNestedV3';
import { validateBuildCallInput } from './removeLiquidityNestedV2/validateInputs';
import { Address, encodeFunctionData, Hex, zeroAddress } from 'viem';
import { balancerCompositeLiquidityRouterNestedAbiExtended } from '@/abi';
import { ChainId, protocolVersionError, SDKError } from '@/utils';

export class RemoveLiquidityNested {
    async query(
        input: RemoveLiquidityNestedInput,
        nestedPoolState: NestedPoolState,
        block?: bigint,
    ): Promise<RemoveLiquidityNestedQueryOutput> {
        validateNestedPoolState(nestedPoolState);
        switch (nestedPoolState.protocolVersion) {
            case 1: {
                throw protocolVersionError(
                    'RemoveLiquidityNested',
                    nestedPoolState.protocolVersion,
                );
            }
            case 2: {
                const removeLiquidity = new RemoveLiquidityNestedV2();
                return removeLiquidity.query(input, nestedPoolState);
            }
            case 3: {
                const removeLiquidity = new RemoveLiquidityNestedV3();
                return removeLiquidity.query(input, nestedPoolState, block);
            }
        }
    }

    buildCall(
        input: RemoveLiquidityNestedCallInput,
    ): RemoveLiquidityNestedBuildCallOutput {
        switch (input.protocolVersion) {
            case 2: {
                validateBuildCallInput(input);
                const removeLiquidity = new RemoveLiquidityNestedV2();
                return removeLiquidity.buildCall(input);
            }
            case 3: {
                const removeLiquidity = new RemoveLiquidityNestedV3();
                return removeLiquidity.buildCall(input);
            }
        }
    }

    public buildCallWithPermit(
        input: RemoveLiquidityNestedCallInput,
        permit: Permit,
    ): RemoveLiquidityNestedBuildCallOutput {
        const buildCallOutput = this.buildCall(input);

        const args = [
            permit.batch,
            permit.signatures,
            { details: [], spender: zeroAddress, sigDeadline: 0n },
            '0x',
            [buildCallOutput.callData],
        ] as const;
        const callData = encodeFunctionData({
            abi: balancerCompositeLiquidityRouterNestedAbiExtended,
            functionName: 'permitBatchAndCall',
            args,
        });

        return {
            ...buildCallOutput,
            callData,
        };
    }

    /**
     * Helper to construct RemoveLiquidityNestedCallInput with proper type resolving.
     * @param queryOutput
     * @param params
     * @returns RemoveLiquidityNestedCallInput
     */
    buildRemoveLiquidityInput(
        queryOutput: RemoveLiquidityNestedQueryOutput,
        params: {
            slippage: Slippage;
            accountAddress?: Address;
            relayerApprovalSignature?: Hex;
            wethIsEth?: boolean;
        },
    ): RemoveLiquidityNestedCallInput {
        if (queryOutput.protocolVersion === 2) {
            return {
                ...queryOutput,
                protocolVersion: 2,
                slippage: params.slippage,
                accountAddress: params.accountAddress!,
                relayerApprovalSignature: params.relayerApprovalSignature,
                wethIsEth: params.wethIsEth,
            };
        }
        return {
            ...queryOutput,
            protocolVersion: 3,
            slippage: params.slippage,
        };
    }
}
