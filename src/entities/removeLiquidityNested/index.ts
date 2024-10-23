import { Address, Hex } from 'viem';
import { TokenAmount, NestedPoolState } from '@/entities';
import { validateNestedPoolState } from '@/entities/utils';
import {
    RemoveLiquidityNestedQueryOutput,
    RemoveLiquidityNestedCallInput,
    RemoveLiquidityNestedInput,
} from './removeLiquidityNestedV2/types';
import { validateBuildCallInput } from './validateInputs';
import { RemoveLiquidityNestedV2 } from './removeLiquidityNestedV2';

export class RemoveLiquidityNested {
    async query(
        input: RemoveLiquidityNestedInput,
        nestedPoolState: NestedPoolState,
    ): Promise<RemoveLiquidityNestedQueryOutput> {
        validateNestedPoolState(nestedPoolState);
        switch (nestedPoolState.protocolVersion) {
            case 1: {
                throw new Error(
                    'RemoveLiquidityNested not supported for ProtocolVersion 1.',
                );
            }
            case 2: {
                const addLiquidity = new RemoveLiquidityNestedV2();
                return addLiquidity.query(input, nestedPoolState);
            }
            case 3: {
                throw new Error(
                    'RemoveLiquidityNested not supported for ProtocolVersion 3.',
                );
            }
        }
    }

    buildCall(input: RemoveLiquidityNestedCallInput): {
        callData: Hex;
        to: Address;
        minAmountsOut: TokenAmount[];
    } {
        validateBuildCallInput(input);

        switch (input.protocolVersion) {
            case 1: {
                throw new Error(
                    'AddLiquidityNested not supported for ProtocolVersion 1.',
                );
            }
            case 2: {
                const removeLiquidity = new RemoveLiquidityNestedV2();
                return removeLiquidity.buildCall(input);
            }
            case 3: {
                throw new Error(
                    'AddLiquidityNested not supported for ProtocolVersion 3.',
                );
            }
        }
    }
}
