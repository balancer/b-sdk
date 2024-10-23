import { NestedPoolState } from '@/entities';
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
                const removeLiquidity = new RemoveLiquidityNestedV2();
                return removeLiquidity.query(input, nestedPoolState);
            }
            case 3: {
                const removeLiquidity = new RemoveLiquidityNestedV3();
                return removeLiquidity.query(input, nestedPoolState);
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
}
