import { Address, Hex } from 'viem';
import {
    AddLiquidityNestedCallInputV2,
    AddLiquidityNestedQueryOutputV2,
    AddLiquidityNestedInputV2,
} from './addLiquidityNestedV2/types';
import {
    AddLiquidityNestedCallInputV3,
    AddLiquidityNestedInputV3,
    AddLiquidityNestedQueryOutputV3,
} from './addLiquidityNestedV3/types';
import { InputAmount } from '@/types';
import { ChainId } from '@/utils';

export type AddLiquidityNestedBaseInput = {
    amountsIn: InputAmount[];
    chainId: ChainId;
    rpcUrl: string;
};

export type AddLiquidityNestedInput =
    | AddLiquidityNestedInputV2
    | AddLiquidityNestedInputV3;

export type AddLiquidityNestedQueryOutput =
    | AddLiquidityNestedQueryOutputV2
    | AddLiquidityNestedQueryOutputV3;

export type AddLiquidityNestedCallInput =
    | AddLiquidityNestedCallInputV2
    | AddLiquidityNestedCallInputV3;

export type AddLiquidityNestedBuildCallOutput = {
    callData: Hex;
    to: Address;
    value: bigint;
    minBptOut: bigint;
};
