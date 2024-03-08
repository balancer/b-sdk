import { Address } from '@/types';
import {
    RemoveLiquidityBaseBuildCallInput,
    RemoveLiquidityBaseQueryOutput,
} from '../types';
import {
    RemoveLiquidityV2ComposableStableBuildCallInput,
    RemoveLiquidityV2ComposableStableQueryOutput,
} from './composableStable/types';

export type RemoveLiquidityV2BaseBuildCallInput =
    RemoveLiquidityBaseBuildCallInput & {
        sender: Address;
        recipient: Address;
    };

export type RemoveLiquidityV2BuildCallInput =
    | RemoveLiquidityV2BaseBuildCallInput
    | RemoveLiquidityV2ComposableStableBuildCallInput;

export type RemoveLiquidityV2BaseQueryOutput =
    RemoveLiquidityBaseQueryOutput & {
        vaultVersion: 2;
    };

export type RemoveLiquidityV2QueryOutput =
    | RemoveLiquidityV2BaseQueryOutput
    | RemoveLiquidityV2ComposableStableQueryOutput;
