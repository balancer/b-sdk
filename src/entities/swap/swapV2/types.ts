import { Address } from 'viem';
import { SwapCallBuildBase, SwapCallBase } from '../types';

export type SwapCallBuildV2 = SwapCallBuildBase & {
    sender: Address;
    recipient: Address;
};

export type SwapCallV2 = SwapCallBase & {
    sender: Address;
    recipient: Address;
};
