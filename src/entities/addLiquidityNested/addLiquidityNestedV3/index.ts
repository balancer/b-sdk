import { NestedPoolState } from '@/entities/types';
import {
    AddLiquidityNestedBuildCallOutput,
    AddLiquidityNestedCallInput,
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutput,
} from '../types';

export class AddLiquidityNestedV3 {
    async query(
        _input: AddLiquidityNestedInput,
        _nestedPoolState: NestedPoolState,
    ): Promise<AddLiquidityNestedQueryOutput> {
        return {} as AddLiquidityNestedQueryOutput;
    }

    buildCall(
        _input: AddLiquidityNestedCallInput,
    ): AddLiquidityNestedBuildCallOutput {
        return {} as AddLiquidityNestedBuildCallOutput;
    }
}
