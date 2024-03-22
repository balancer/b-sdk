import {
    AddLiquidityV2BaseBuildCallInput,
    AddLiquidityV2BaseQueryOutput,
} from '../types';

export type AddLiquidityV2ComposableStableQueryOutput =
    AddLiquidityV2BaseQueryOutput & {
        bptIndex: number;
    };

export type AddLiquidityV2ComposableStableBuildCallInput =
    AddLiquidityV2BaseBuildCallInput &
        AddLiquidityV2ComposableStableQueryOutput;
