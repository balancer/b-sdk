import { RawPool } from './data';
import {
    BasePool,
    BasePoolFactory,
    Swap,
    Token,
    TokenAmount,
} from './entities';
import { PoolParser } from './entities/pools/parser';
import { SwapInputRawAmount, SwapKind, SwapOptions } from './types';
import { ChainId, checkInputs } from './utils';
import { Router } from './router';
import { SwapV2 } from './entities/swap/swapV2';
import { SwapV3 } from './entities/swap/swapV3';

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
    balancerVersion: 2 | 3,
    swapOptions?: Omit<SwapOptions, 'graphTraversalConfig.poolIdsToInclude'>,
): Promise<Swap | null> {
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

    if(candidatePaths.length === 0) return null;

    const bestPaths = router.getBestPaths(
        candidatePaths,
        swapKind,
        checkedSwapAmount,
    );

    if (!bestPaths) return null;

    switch (balancerVersion) {
        case 2:
            return new SwapV2({
                paths: bestPaths,
                swapKind,
            });
        case 3:
            return new SwapV3({
                paths: bestPaths,
                swapKind,
            });
    }
}
