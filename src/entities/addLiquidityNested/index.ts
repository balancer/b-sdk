import { NestedPoolState } from '../types';
import { validateNestedPoolState } from '../utils';
import { AddLiquidityNestedV2 } from './addLiquidityNestedV2';
import {
    AddLiquidityNestedBuildCallOutput,
    AddLiquidityNestedCallInput,
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutput,
} from './types';
import { AddLiquidityNestedV3 } from './addLiquidityNestedV3';
import { Permit2 } from '../permit2Helper';
import { AddLiquidityNestedCallInputV3 } from './addLiquidityNestedV3/types';
import { Slippage } from '../slippage';
import { Address, Hex } from 'viem';
import { protocolVersionError, SDKError } from '@/utils/errors';
import { ChainId } from '@/utils';

export class AddLiquidityNested {
    async query(
        input: AddLiquidityNestedInput,
        nestedPoolState: NestedPoolState,
        block?: bigint,
    ): Promise<AddLiquidityNestedQueryOutput> {
        validateNestedPoolState(nestedPoolState);
        switch (nestedPoolState.protocolVersion) {
            case 1: {
                throw protocolVersionError(
                    'AddLiquidityNested',
                    nestedPoolState.protocolVersion,
                );
            }
            case 2: {
                const addLiquidity = new AddLiquidityNestedV2();
                return addLiquidity.query(input, nestedPoolState);
            }
            case 3: {
                const addLiquidity = new AddLiquidityNestedV3();
                return addLiquidity.query(input, nestedPoolState, block);
            }
        }
    }

    buildCall(
        input: AddLiquidityNestedCallInput,
    ): AddLiquidityNestedBuildCallOutput {
        switch (input.protocolVersion) {
            case 2: {
                const addLiquidity = new AddLiquidityNestedV2();
                return addLiquidity.buildCall(input);
            }
            case 3: {
                const addLiquidity = new AddLiquidityNestedV3();
                return addLiquidity.buildCall(input);
            }
        }
    }

    public buildCallWithPermit2(
        input: AddLiquidityNestedCallInputV3,
        permit2: Permit2,
    ): AddLiquidityNestedBuildCallOutput {
        const addLiquidity = new AddLiquidityNestedV3();
        return addLiquidity.buildCallWithPermit2(input, permit2);
    }

    /**
     * Helper to construct AddLiquidityNestedCallInput with proper type resolving.
     * @param queryOutput
     * @param params
     * @returns AddLiquidityNestedCallInput
     */
    buildAddLiquidityInput(
        queryOutput: AddLiquidityNestedQueryOutput,
        params: {
            slippage: Slippage;
            accountAddress?: Address;
            relayerApprovalSignature?: Hex;
            wethIsEth?: boolean;
        },
    ): AddLiquidityNestedCallInput {
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
