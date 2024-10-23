import { Address, Hex } from '../../types';
import {
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutput,
    AddLiquidityNestedCallInput,
} from './addLiquidityNestedV2/types';
// import { validateQueryInput } from './addLiquidityNestedV2/validateInputs';
import { NestedPoolState } from '../types';
import { validateNestedPoolState } from '../utils';
import { AddLiquidityNestedV2 } from './addLiquidityNestedV2';

export class AddLiquidityNested {
    constructor(public config?: AddLiquidityConfig) {}

    async query(
        input: AddLiquidityNestedInput,
        nestedPoolState: NestedPoolState,
    ): Promise<AddLiquidityNestedQueryOutput> {
        // const amountsIn = validateQueryInput(input, nestedPoolState);
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

    buildCall(input: AddLiquidityNestedCallInput): {
        callData: Hex;
        to: Address;
        value: bigint | undefined;
        minBptOut: bigint;
    } {
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
