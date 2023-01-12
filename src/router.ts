import { SwapKind } from './types';
import { BasePool, Path, Swap, Token, TokenAmount } from './entities';
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

    console.log(JSON.stringify(bestPaths));

    // const [paths] = calculatePathLimits(bestPaths, swapKind);

    return bestPaths;
  }

  getBestPaths = async (
    paths: Path[],
    swapKind: SwapKind,
    swapAmount: TokenAmount
  ): Promise<Swap> => {
    const swap = await Swap.fromPaths(paths, swapKind, swapAmount);

    return swap;
  }

}

