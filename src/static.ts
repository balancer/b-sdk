import { RawPool } from './data';
import {
    BasePool,
    BasePoolFactory,
    SwapLocal,
    Token,
    TokenAmount,
} from './entities';
import { PoolParser } from './entities/pools/parser';
import { SwapInputRawAmount, SwapKind, SwapOptions } from './types';
import { ChainId, checkInputs } from './utils';
import { Router } from './router';

export function sorParseRawPools(
    chainId: ChainId,
    pools: RawPool[],
    customPoolFactories: BasePoolFactory[] = [],
): BasePool[] {
    const poolParser = new PoolParser(chainId, customPoolFactories);

    return poolParser.parseRawPools(pools);
}

export async function sorGetSwapsWithPools(
    tokenIn: Token,
    tokenOut: Token,
    swapKind: SwapKind,
    swapAmount: SwapInputRawAmount | TokenAmount,
    pools: BasePool[],
    swapOptions?: Omit<SwapOptions, 'graphTraversalConfig.poolIdsToInclude'>,
): Promise<SwapLocal | null> {
    const checkedSwapAmount = checkInputs(
        tokenIn,
        tokenOut,
        swapKind,
        swapAmount,
    );
    const router = new Router();

    const candidatePaths = router.getCandidatePaths(
        tokenIn,
        tokenOut,
        pools,
        swapOptions?.graphTraversalConfig,
    );

    if (candidatePaths.length === 0) return null;

    const bestPaths = router.getBestPaths(
        candidatePaths,
        swapKind,
        checkedSwapAmount,
    );

    if (!bestPaths) return null;

    return new SwapLocal({ paths: bestPaths, swapKind });
}
