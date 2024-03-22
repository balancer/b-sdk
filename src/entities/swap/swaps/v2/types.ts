import { Address } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';

export type SwapBuildCallInputBaseV2 = {
    sender: Address;
    recipient: Address;
};

export type SwapBuildCallInputV2 = SwapBuildCallInputBaseV2 & {
    deadline: bigint;
    limitAmount: TokenAmount;
    wethIsEth: boolean;
};
