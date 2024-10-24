import { Address, Hex } from 'viem';
import {
    RemoveLiquidityNestedProportionalInputV2,
    RemoveLiquidityNestedSingleTokenInputV2,
    RemoveLiquidityNestedQueryOutputV2,
    RemoveLiquidityNestedCallInputV2,
} from './removeLiquidityNestedV2/types';
import {
    RemoveLiquidityNestedCallInputV3,
    RemoveLiquidityNestedQueryOutputV3,
} from './removeLiquidityNestedV3/types';
import { TokenAmount } from '../tokenAmount';

export type RemoveLiquidityNestedInput =
    | RemoveLiquidityNestedProportionalInputV2
    | RemoveLiquidityNestedSingleTokenInputV2;

export type RemoveLiquidityNestedQueryOutput =
    | RemoveLiquidityNestedQueryOutputV2
    | RemoveLiquidityNestedQueryOutputV3;

export type RemoveLiquidityNestedCallInput =
    | RemoveLiquidityNestedCallInputV2
    | RemoveLiquidityNestedCallInputV3;

export type RemoveLiquidityNestedBuildCallOutput = {
    callData: Hex;
    to: Address;
    minAmountsOut: TokenAmount[];
};
