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

export type AddLiqudityV2QueryOutput =
    | AddLiquidityBaseQueryOutput
    | AddLiquidityV2ComposableStableQueryOutput;
