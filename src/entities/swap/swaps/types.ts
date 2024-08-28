import { TokenAmount } from '../../tokenAmount';
import {
    ExactInQueryOutput,
    ExactOutQueryOutput,
    Permit2,
    SwapBuildCallInput,
    SwapBuildOutputExactIn,
    SwapBuildOutputExactOut,
} from '../../..';
import { SingleSwap, SwapKind, BatchSwapStep } from '../../../types';
import { PathWithAmount } from '../paths/pathWithAmount';
import {
    SingleTokenExactIn,
    SingleTokenExactOut,
    SwapPathExactAmountIn,
    SwapPathExactAmountOut,
} from '../swaps/v3';
import { Address } from 'viem';

export interface SwapBase {
    chainId: number;
    isBatchSwap: boolean;
    paths: PathWithAmount[];
    swapKind: SwapKind;
    swaps:
        | BatchSwapStep[]
        | SingleSwap
        | SingleTokenExactIn
        | SingleTokenExactOut
        | SwapPathExactAmountIn[]
        | SwapPathExactAmountOut[];
    quote: TokenAmount;
    inputAmount: TokenAmount;
    outputAmount: TokenAmount;
    query(
        rpcUrl?: string,
        block?: bigint,
        account?: Address,
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput>;
    queryCallData(): string;
    buildCall(
        input: SwapBuildCallInput,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut;
    buildCallWithPermit2(
        input: SwapBuildCallInput,
        permit2: Permit2,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut;
}
