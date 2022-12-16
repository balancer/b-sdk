import { getAddress } from '@ethersproject/address';
import { SwapKind } from './types';
import { Path, Swap, TokenAmount } from './entities';

import { Token } from './entities';
import { SubgraphPool } from './poolProvider';
import { BasePool } from './entities';
import { WeightedPool } from './entities/pool/weighted';

export interface hopDictionary {
  [hopToken: string]: Set<string>; // the set of pool ids
}

export interface PoolDictionary {
  [poolId: string]: any;
}

export const getCandidatePaths = (
  tokenIn: Token,
  tokenOut: Token,
  swapKind: SwapKind,
  pools: SubgraphPool[]
): Path[] => {
  const directPools = filterPoolsOfInterest(pools, tokenIn, tokenOut);

  const paths = producePaths(tokenIn, tokenOut, directPools);

  return paths;
}

export const filterPoolsOfInterest = (
  allPools: SubgraphPool[],
  tokenIn: Token,
  tokenOut: Token
): SubgraphPool[] => {
  const directPools: SubgraphPool[] = [];
  const hopsIn: hopDictionary = {};
  const hopsOut: hopDictionary = {};

  allPools.forEach(p => {
    const tokenListSet = new Set(p.tokensList.map(a => getAddress(a)));
    const containsTokenIn = tokenListSet.has(tokenIn.address);
    const containsTokenOut = tokenListSet.has(tokenOut.address);

    // This is a direct pool as has both tokenIn and tokenOut
    if (containsTokenIn && containsTokenOut) {
      directPools.push(p);
      return;
    }

    if (containsTokenIn && !containsTokenOut) {
      for (const hopToken of tokenListSet) {
        if (!hopsIn[hopToken as any]) hopsIn[hopToken as any] = new Set([]);
        hopsIn[hopToken as any].add(p.id);
      }
    } else if (!containsTokenIn && containsTokenOut) {
      for (const hopToken of [...tokenListSet]) {
        if (!hopsOut[hopToken as any]) hopsOut[hopToken as any] = new Set([]);
        hopsOut[hopToken as any].add(p.id);
      }
    }
  });
  return directPools;
}

export const producePaths = (
  tokenIn: Token,
  tokenOut: Token,
  directPools: SubgraphPool[]
): Path[] => {
  const paths: Path[] = [];

  // Create direct paths
  const pools: BasePool[] = [];
  directPools.forEach(p => {
    if (p.poolType === 'Weighted') {
      pools.push(WeightedPool.fromRawPool(p));
    }
  });

  const sortedPools = pools.sort((a, b) => {
    return Number(b.getNormalizedLiquidity(tokenIn, tokenOut) -
      a.getNormalizedLiquidity(tokenIn, tokenOut));
  });

  const path = new Path([tokenIn, tokenOut], [sortedPools[0]]);
  paths.push(path);

  return paths;
}

export const getBestPaths = async (
    paths: Path[],
    swapKind: SwapKind,
    swapAmount: TokenAmount
  ): Promise<Swap> => {
    const swap = await Swap.fromPaths(paths, swapKind, swapAmount);

    return swap;
}
