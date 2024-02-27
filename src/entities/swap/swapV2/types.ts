import { Address } from 'viem';
import { SwapCallBuildV3, CallInputBase } from '../types';

export type SwapCallBuildV2 = SwapCallBuildV3 & {
    sender: Address;
    recipient: Address;
};

export type SwapCallV2 = CallInputBase & {
    sender: Address;
    recipient: Address;
};
