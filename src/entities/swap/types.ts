import { TokenAmount } from '../tokenAmount';
import { MinimalToken } from '../..';
import { SingleSwap, SwapKind, BatchSwapStep } from '../../types';
import { PathWithAmount } from './pathWithAmount';
import { Address, Hex } from 'viem';

export type SwapBuildOutput = {
    to: Address;
    callData: Hex;
    value: bigint;
};

export type TokenApi = Omit<MinimalToken, 'index'>;

export type Path = {
    pools: Address[] | Hex[];
    tokens: TokenApi[];
    outputAmountRaw: bigint;
    inputAmountRaw: bigint;
    balancerVersion: 2 | 3;
};

export interface SwapBase {
    chainId: number;
    isBatchSwap: boolean;
    paths: PathWithAmount[];
    assets: Address[];
    swapKind: SwapKind;
    swaps: BatchSwapStep[] | SingleSwap;
    quote: TokenAmount;
    inputAmount: TokenAmount;
    outputAmount: TokenAmount;
    query(rpcUrl?: string, block?: bigint): Promise<TokenAmount>;
    queryCallData(): string;
    buildCall(
        limits: bigint[],
        deadline: bigint,
        sender: Address,
        recipient: Address,
    ): SwapBuildOutput;
}
