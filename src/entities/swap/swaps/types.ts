import { TokenAmount } from '../../tokenAmount';
import {
    ExactInQueryOutput,
    ExactOutQueryOutput,
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
    ): Promise<ExactInQueryOutput | ExactOutQueryOutput>;
    queryCallData(): string;
    buildCall(
        input: SwapBuildCallInput,
    ): SwapBuildOutputExactIn | SwapBuildOutputExactOut;
}
