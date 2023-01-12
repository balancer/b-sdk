import { SwapKind } from './types';
import { BasePool, Path, PathWithAmount, Swap, Token, TokenAmount } from './entities';
import { WeightedPool } from './entities/pool/weighted';
import { SubgraphPool } from './poolProvider';
import { PathGraph } from './pathGraph/pathGraph';

export class Router {
  cache: Record<string, { paths: Path[] }> = {};
  private readonly pathGraph: PathGraph;

  constructor() {
    this.pathGraph = new PathGraph();
  }

  public initPathGraphWithPools(pools: BasePool[]): void {
    this.pathGraph.buildGraph({
      pools: Object.values(pools),
    });
  }
  
  getCandidatePaths = (
    tokenIn: Token,
    tokenOut: Token,
    swapKind: SwapKind,
    rawPools: SubgraphPool[]
  ): Path[] => {

    if (!this.pathGraph.isGraphInitialized) {
      const pools: BasePool[] = [];
      rawPools.forEach(p => {
        if (p.poolType === 'Weighted') {
          pools.push(WeightedPool.fromRawPool(p));
        }
      });

      this.pathGraph.buildGraph({
        pools,
      });
    }

    const bestPaths = this.pathGraph.traverseGraphAndFindBestPaths({
      tokenIn,
      tokenOut,
    });

    return bestPaths;
  }

  getBestPaths = async (
    paths: Path[],
    swapKind: SwapKind,
    swapAmount: TokenAmount
  ): Promise<Swap> => {
    // TODO: Refactor these hacks so path outputAmount is not async
    const quotePaths = paths.map(path => {
      return new PathWithAmount(path.tokens, path.pools, swapAmount);
    });
    const valueArr = await Promise.all(quotePaths.map(async (item) => {
      return {
        item,
        value: Number((await item.outputAmount()).amount)
      }
    }))
    valueArr.sort((a, b) => b.value - a.value)
    
    const orderedQuotePaths = valueArr.map(item => item.item);

    const swap = await Swap.fromPaths(orderedQuotePaths.slice(0, 2), swapKind);

    return swap;
  }

}

