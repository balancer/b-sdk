import { NestedPoolState } from '@/entities/types';
import {
    RemoveLiquidityNestedCallInputV3,
    RemoveLiquidityNestedProportionalInputV3,
    RemoveLiquidityNestedQueryOutputV3,
} from './types';
import { RemoveLiquidityNestedBuildCallOutput } from '../types';

export class RemoveLiquidityNestedV3 {
    async query(
        _input: RemoveLiquidityNestedProportionalInputV3,
        _nestedPoolState: NestedPoolState,
    ): Promise<RemoveLiquidityNestedQueryOutputV3> {
        return {} as RemoveLiquidityNestedQueryOutputV3;
    }

    buildCall(
        _input: RemoveLiquidityNestedCallInputV3,
    ): RemoveLiquidityNestedBuildCallOutput {
        return {} as RemoveLiquidityNestedBuildCallOutput;
    }
}
