import { Address } from '@/types';
import {
    AddLiquidityBaseBuildCallInput,
    AddLiquidityBaseQueryOutput,
} from '../types';
import {
    AddLiquidityV2ComposableStableBuildCallInput,
    AddLiquidityV2ComposableStableQueryOutput,
} from './composableStable/types';

export type AddLiquidityV2BaseBuildCallInput =
    AddLiquidityBaseBuildCallInput & {
        fromInternalBalance?: boolean;
        sender: Address;
        recipient: Address;
    };

export type AddLiquidityV2BuildCallInput =
    | AddLiquidityV2BaseBuildCallInput
    | AddLiquidityV2ComposableStableBuildCallInput;

export type AddLiquidityV2BaseQueryOutput = AddLiquidityBaseQueryOutput & {
    vaultVersion: 2;
};

export type AddLiquidityV2QueryOutput =
    | AddLiquidityV2BaseQueryOutput
    | AddLiquidityV2ComposableStableQueryOutput;
