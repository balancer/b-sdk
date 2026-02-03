import { Address, Hex } from 'viem';
import { Slippage } from '../slippage';
import { TokenAmount } from '../tokenAmount';
import { InputAmount } from '@/types';

export type AddLiquidityUnbalancedViaSwapInput = {
    chainId: number;
    rpcUrl: string;
    expectedAdjustableAmountIn: InputAmount;
    addLiquidityUserData?: Hex;
    swapUserData?: Hex;
    sender?: Address;
};

export type AddLiquidityUnbalancedViaSwapQueryOutput = {
    pool: Address;
    bptOut: TokenAmount;
    exactAmountIn: TokenAmount;
    expectedAdjustableAmountIn: TokenAmount;
    chainId: number;
    protocolVersion: 3;
    to: Address;
    addLiquidityUserData: Hex;
    swapUserData: Hex;
};

export type AddLiquidityUnbalancedViaSwapBuildCallInput = {
    slippage: Slippage;
    wethIsEth?: boolean;
    deadline: bigint;
} & AddLiquidityUnbalancedViaSwapQueryOutput;

export type AddLiquidityUnbalancedViaSwapBuildCallOutput = {
    callData: Hex;
    to: Address;
    value: bigint;
    bptOut: TokenAmount;
    expectedAdjustableAmountIn: TokenAmount;
    maxAdjustableAmountIn: TokenAmount;
};
