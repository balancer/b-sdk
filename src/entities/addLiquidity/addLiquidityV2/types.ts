import { Address } from 'viem';
import { AddLiquidityBaseCall, AddLiquidityBaseQueryOutput } from '../types';
import {
    AddLiquidityV2ComposableStableCall,
    AddLiquidityV2ComposableStableQueryOutput,
} from './composableStable/types';

export type AddLiquidityV2BaseCall = AddLiquidityBaseCall & {
    sender: Address;
    recipient: Address;
};

export type AddLiquidityV2Call =
    | AddLiquidityV2BaseCall
    | AddLiquidityV2ComposableStableCall;

type AddLiquidityV2BaseQueryOutput = AddLiquidityBaseQueryOutput & {
    fromInternalBalance: boolean;
    vaultVersion: 2;
};

export type AddLiqudityV2QueryOutput =
    | AddLiquidityV2BaseQueryOutput
    | AddLiquidityV2ComposableStableQueryOutput;
