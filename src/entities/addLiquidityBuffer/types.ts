import { Address, Hex } from 'viem';
import { Slippage } from '../slippage';
import { TokenAmount } from '../tokenAmount';

export type AddLiquidityBufferInput = {
    chainId: number;
    rpcUrl: string;
    exactSharesToIssue: bigint;
};

export type AddLiquidityBufferQueryOutput = {
    exactSharesToIssue: bigint;
    wrappedAmountIn: TokenAmount;
    underlyingAmountIn: TokenAmount;
    chainId: number;
    protocolVersion: 3;
    to: Address;
};

export type AddLiquidityBufferBuildCallInput = {
    slippage: Slippage;
} & AddLiquidityBufferQueryOutput;

export type AddLiquidityBufferBuildCallOutput = {
    callData: Hex;
    to: Address;
    value: bigint;
    exactSharesToIssue: bigint;
    maxWrappedAmountIn: TokenAmount;
    maxUnderlyingAmountIn: TokenAmount;
};
