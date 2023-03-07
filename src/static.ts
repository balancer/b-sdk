import { OnChainPoolDataEnricher, RawPool, SubgraphPoolProvider } from './data';
import { BasePool, BasePoolFactory, Swap, Token, TokenAmount } from './entities';
import { PoolParser } from './entities/pools/parser';
import { SwapInfo, SwapKind, SwapOptions } from './types';
import { BALANCER_SOR_QUERIES_ADDRESS, ChainId, checkInputs, SUBGRAPH_URLS } from './utils';
import { Router } from './router';
import { SmartOrderRouter } from './sor';
import { JsonRpcProvider } from '@ethersproject/providers';

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
    swapAmount: TokenAmount,
    pools: BasePool[],
    swapOptions?: Omit<SwapOptions, 'graphTraversalConfig.poolIdsToInclude'>,
): Promise<SwapInfo> {
    checkInputs(tokenIn, tokenOut, swapKind, swapAmount);
    const router = new Router();

    const candidatePaths = router.getCandidatePaths(
        tokenIn,
        tokenOut,
        swapKind,
        pools,
        swapOptions?.graphTraversalConfig,
    );
    const bestPaths = router.getBestPaths(candidatePaths, swapKind, swapAmount);

    const swap = new Swap({ paths: bestPaths, swapKind });

    return {
        quote: swapKind === SwapKind.GivenIn ? swap.outputAmount : swap.inputAmount,
        swap,
    };
}

export function sorInitForChain(chainId: ChainId, rpcUrl: string): SmartOrderRouter {
    const provider = new JsonRpcProvider(rpcUrl);
    const subgraphPoolDataService = new SubgraphPoolProvider(chainId, SUBGRAPH_URLS[chainId]);
    const onChainPoolDataEnricher = new OnChainPoolDataEnricher(
        rpcUrl,
        BALANCER_SOR_QUERIES_ADDRESS,
    );

    return new SmartOrderRouter({
        chainId,
        provider,
        poolDataProviders: subgraphPoolDataService,
        poolDataEnrichers: onChainPoolDataEnricher,
        rpcUrl,
    });
}
