import { Address } from 'viem';
import {
    SwapCallBuildBase,
    SwapCallExactInBase,
    SwapCallExactOutBase,
} from '../types';

export type SwapCallBuildV2 = SwapCallBuildBase & {
    sender: Address;
    recipient: Address;
};

export type SwapCallExactInV2 = SwapCallExactInBase & {
    sender: Address;
    recipient: Address;
};

export type SwapCallExactOutV2 = SwapCallExactOutBase & {
    sender: Address;
    recipient: Address;
};
