import { RawPool } from './data';
import {
    BasePool,
    BasePoolFactory,
    SwapV2,
    SwapV3,
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
    balancerVersion: 2 | 3,
    tokenIn: Token,
    tokenOut: Token,
    swapKind: SwapKind,
    swapAmount: SwapInputRawAmount | TokenAmount,
    pools: BasePool[],
    swapOptions?: Omit<SwapOptions, 'graphTraversalConfig.poolIdsToInclude'>,
): Promise<SwapV2 | SwapV3 | null> {
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
    const bestPaths = router.getBestPaths(
        candidatePaths,
        swapKind,
        checkedSwapAmount,
    );

    if (!bestPaths) return null;

    if (balancerVersion === 2)
        return new SwapV2({ paths: bestPaths, swapKind });
    else return new SwapV3({ paths: bestPaths, swapKind });
}
