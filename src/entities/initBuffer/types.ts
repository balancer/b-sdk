import { Address, Hex } from 'viem';
import { Slippage } from '../slippage';
import { TokenAmount } from '../tokenAmount';
import { InputAmount } from '@/types';

export type InitBufferInput = {
    chainId: number;
    rpcUrl: string;
    wrappedAmountIn: InputAmount;
    underlyingAmountIn: InputAmount;
};

export type InitBufferQueryOutput = {
    issuedShares: bigint;
    wrappedAmountIn: TokenAmount;
    underlyingAmountIn: TokenAmount;
    chainId: number;
    protocolVersion: 3;
    to: Address;
};

export type InitBufferBuildCallInput = {
    slippage: Slippage;
} & InitBufferQueryOutput;

export type InitBufferBuildCallOutput = {
    callData: Hex;
    to: Address;
    value: bigint;
    minIssuedShares: bigint;
};
