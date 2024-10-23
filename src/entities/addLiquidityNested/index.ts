import {
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutput,
    AddLiquidityNestedCallInput,
} from './addLiquidityNestedV2/types';
import { NestedPoolState } from '../types';
import { validateNestedPoolState } from '../utils';
import { AddLiquidityNestedV2 } from './addLiquidityNestedV2';
import { AddLiquidityNestedBuildCallOutput } from './types';

export class AddLiquidityNested {
    async query(
        input: AddLiquidityNestedInput,
        nestedPoolState: NestedPoolState,
    ): Promise<AddLiquidityNestedQueryOutput> {
        validateNestedPoolState(nestedPoolState);
        switch (nestedPoolState.protocolVersion) {
            case 1: {
                throw new Error(
                    'AddLiquidityNested not supported for ProtocolVersion 1.',
                );
            }
            case 2: {
                const addLiquidity = new AddLiquidityNestedV2();
                return addLiquidity.query(input, nestedPoolState);
            }
            case 3: {
                throw new Error(
                    'AddLiquidityNested not supported for ProtocolVersion 3.',
                );
            }
        }
    }

    buildCall(
        input: AddLiquidityNestedCallInput,
    ): AddLiquidityNestedBuildCallOutput {
        switch (input.protocolVersion) {
            case 1: {
                throw new Error(
                    'AddLiquidityNested not supported for ProtocolVersion 1.',
                );
            }
            case 2: {
                const addLiquidity = new AddLiquidityNestedV2();
                return addLiquidity.buildCall(input);
            }
            case 3: {
                throw new Error(
                    'AddLiquidityNested not supported for ProtocolVersion 3.',
                );
            }
        }
    }
}
