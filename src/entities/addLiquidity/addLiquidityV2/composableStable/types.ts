import {
    AddLiquidityV2BaseCall,
    AddLiquidityV2BaseQueryOutput,
} from '../types';

export type AddLiquidityV2ComposableStableQueryOutput =
    AddLiquidityV2BaseQueryOutput & {
        bptIndex: number;
    };

export type AddLiquidityV2ComposableStableCall = AddLiquidityV2BaseCall &
    AddLiquidityV2ComposableStableQueryOutput;
