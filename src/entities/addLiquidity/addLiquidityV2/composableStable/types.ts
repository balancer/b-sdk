import { AddLiquidityBaseQueryOutput } from '../../types';
import { AddLiquidityV2BaseCall } from '../types';

export type AddLiquidityV2ComposableStableQueryOutput =
    AddLiquidityBaseQueryOutput & {
        bptIndex: number;
    };

export type AddLiquidityV2ComposableStableCall = AddLiquidityV2BaseCall &
    AddLiquidityV2ComposableStableQueryOutput;
