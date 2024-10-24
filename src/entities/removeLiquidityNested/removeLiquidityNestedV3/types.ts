import { Address, Hex } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';
import { ChainId } from '@/utils';
import { Slippage } from '@/entities/slippage';

export type RemoveLiquidityNestedProportionalInputV3 = {
    bptAmountIn: bigint;
    chainId: ChainId;
    rpcUrl: string;
    sender?: Address;
    userData?: Hex;
};

export type RemoveLiquidityNestedQueryOutputV3 = {
    protocolVersion: 3;
    bptAmountIn: TokenAmount;
    amountsOut: TokenAmount[];
    chainId: ChainId;
    parentPool: Address;
    userData: Hex;
};

export type RemoveLiquidityNestedCallInputV3 =
    RemoveLiquidityNestedQueryOutputV3 & {
        slippage: Slippage;
    };
