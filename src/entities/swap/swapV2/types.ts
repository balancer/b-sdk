import { Address } from 'viem';
import { CallInputBase, SwapCallBuildBase } from '../types';

export type SwapCallBuildV2 = SwapCallBuildBase & {
    sender: Address;
    recipient: Address;
};

export type SwapCallV2 = CallInputBase & {
    sender: Address;
    recipient: Address;
};
