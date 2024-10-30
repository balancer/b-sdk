import { Address, Hex } from 'viem';
import { InputAmount } from '@/types';
import { RemoveLiquidityKind } from '../removeLiquidity/types';
import { TokenAmount } from '../tokenAmount';
import { Slippage } from '../slippage';

export type RemoveLiquidityBoostedProportionalInput = {
    chainId: number;
    rpcUrl: string;
    bptIn: InputAmount;
    kind: RemoveLiquidityKind.Proportional;
    userAddress?: Address;
    userData?: Hex;
};

export type RemoveLiquidityBoostedQueryOutput = {
    poolType: string;
    poolId: Address;
    removeLiquidityKind: RemoveLiquidityKind.Proportional;
    bptIn: TokenAmount;
    amountsOut: TokenAmount[];
    protocolVersion: 3;
    chainId: number;
    userData: Hex;
};

export type RemoveLiquidityBoostedBuildCallInput = {
    userData: Hex;
    poolType: string;
    poolId: Address;
    removeLiquidityKind: RemoveLiquidityKind.Proportional;
    bptIn: TokenAmount;
    amountsOut: TokenAmount[];
    protocolVersion: 3;
    chainId: number;
    slippage: Slippage;
};
