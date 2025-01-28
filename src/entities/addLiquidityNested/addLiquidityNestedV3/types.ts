import { Slippage } from '@/entities/slippage';
import { TokenAmount } from '@/entities/tokenAmount';
import { ChainId } from '@/utils';
import { Address, Hex } from 'viem';
import { AddLiquidityNestedBaseInput } from '../types';

export type AddLiquidityNestedInputV3 = AddLiquidityNestedBaseInput & {
    wrapUnderlying?: boolean[];
    sender?: Address;
    userData?: Hex;
};

export type AddLiquidityNestedQueryOutputV3 = {
    to: Address;
    amountsIn: TokenAmount[];
    bptOut: TokenAmount;
    protocolVersion: 3;
    parentPool: Address;
    userData: Hex;
    chainId: ChainId;
};

export type AddLiquidityNestedCallInputV3 = AddLiquidityNestedQueryOutputV3 & {
    slippage: Slippage;
    wethIsEth?: boolean;
};
