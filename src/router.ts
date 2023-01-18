import { SwapKind } from './types';
import { BasePool, Path, PathWithAmount, Swap, Token, TokenAmount } from './entities';
import { PathGraph } from './pathGraph/pathGraph';

export class Router {
    cache: Record<string, { paths: Path[] }> = {};
    private readonly pathGraph: PathGraph;

    constructor() {
        this.pathGraph = new PathGraph();
    }

    getCandidatePaths = (
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
        pools: BasePool[],
    ): Path[] => {
        console.time('build graph and get candidate paths');
        this.pathGraph.buildGraph({ pools });

        const candidatePaths = this.pathGraph.getCandidatePaths({ tokenIn, tokenOut });
        console.timeEnd('build graph and get candidate paths');

        return candidatePaths;
    };

    getBestPaths = async (
        paths: Path[],
        swapKind: SwapKind,
        swapAmount: TokenAmount,
    ): Promise<Swap> => {
        // TODO: Refactor these hacks so path outputAmount is not async
        // TODO: swapAmount is being used in full on both paths
        //       this should only be for ordering and then figuring out best split
        const quotePaths = paths.map(path => {
            return new PathWithAmount(path.tokens, path.pools, swapAmount);
        });
        const valueArr = await Promise.all(
            quotePaths.map(async item => {
                return {
                    item,
                    value: Number((await item.outputAmount()).amount),
                };
            }),
        );
        valueArr.sort((a, b) => b.value - a.value);

        const orderedQuotePaths = valueArr.map(item => item.item);

        const swap = await Swap.fromPaths(orderedQuotePaths.slice(0, 2), swapKind);

        return swap;
    };
}
