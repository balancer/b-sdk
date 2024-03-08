import { Address } from 'viem';
import { AddLiquidityBaseCall, AddLiquidityBaseQueryOutput } from '../types';
import {
    AddLiquidityV2ComposableStableCall,
    AddLiquidityV2ComposableStableQueryOutput,
} from './composableStable/types';

export type AddLiquidityV2BaseCall = AddLiquidityBaseCall & {
    fromInternalBalance?: boolean;
    sender: Address;
    recipient: Address;
};

export type AddLiquidityV2Call =
    | AddLiquidityV2BaseCall
    | AddLiquidityV2ComposableStableCall;

export type AddLiquidityV2BaseQueryOutput = AddLiquidityBaseQueryOutput & {
    vaultVersion: 2;
};

export type AddLiqudityV2QueryOutput =
    | AddLiquidityV2BaseQueryOutput
    | AddLiquidityV2ComposableStableQueryOutput;
