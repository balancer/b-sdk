import { Address } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';

export type SwapCallBuildInputBaseV2 = {
    sender: Address;
    recipient: Address;
};

export type SwapCallBuildInputV2 = SwapCallBuildInputBaseV2 & {
    deadline: bigint;
    limitAmount: TokenAmount;
    wethIsEth: boolean;
};
