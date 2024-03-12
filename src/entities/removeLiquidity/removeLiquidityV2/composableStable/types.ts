import { RemoveLiquidityBaseQueryOutput } from '../../types';
import { RemoveLiquidityV2BaseBuildCallInput } from '../types';

export type RemoveLiquidityV2ComposableStableQueryOutput =
    RemoveLiquidityBaseQueryOutput & {
        bptIndex: number;
    };

export type RemoveLiquidityV2ComposableStableBuildCallInput =
    RemoveLiquidityV2BaseBuildCallInput &
        RemoveLiquidityV2ComposableStableQueryOutput;
