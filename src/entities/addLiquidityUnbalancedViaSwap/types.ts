import { Address, Hex } from 'viem';
import { Slippage } from '../slippage';
import { TokenAmount } from '../tokenAmount';
import { InputAmount } from '@/types';

export type AddLiquidityUnbalancedViaSwapInput = {
    chainId: number;
    rpcUrl: string;
    pool: Address;
    amountsIn: InputAmount[];
    exactTokenIndex: number;
    addLiquidityUserData?: Hex;
    swapUserData?: Hex;
    sender?: Address;
};

export type AddLiquidityUnbalancedViaSwapQueryOutput = {
    pool: Address;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    chainId: number;
    protocolVersion: 3;
    to: Address;
    addLiquidityUserData: Hex;
    swapUserData: Hex;
    exactToken: Address;
    exactAmount: bigint;
    adjustableTokenIndex: number;
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
    exactBptAmountOut: TokenAmount;
    maxAdjustableAmount: TokenAmount;
};
