import { BasePool, Token } from '../entities';

export interface PathGraphTraversalConfig {
    maxDepth: number;
    maxNonBoostedPathDepth: number;
    maxNonBoostedHopTokensInBoostedPath: number;
    approxPathsToReturn: number;
    poolIdsToInclude?: string[];
}

export interface PathGraphEdgeData {
    pool: BasePool;
    normalizedLiquidity: bigint;
    tokenIn: Token;
    tokenOut: Token;
}
