import { Router } from './router';
import { BasePool, BasePoolFactory, Path, Token, TokenAmount, Swap } from './entities';
import { ChainId, checkInputs } from './utils';
import { SorConfig, SwapInfo, SwapKind, SwapOptions } from './types';
import { PoolParser } from './entities/pools/parser';
import { PoolDataService } from './data/poolDataService';
import { GetPoolsResponse, RawPool } from './data/types';

export class SmartOrderRouter {
    private readonly chainId: ChainId;
    private readonly router: Router;
    private readonly poolParser: PoolParser;
    private readonly poolDataService: PoolDataService;
    private pools: BasePool[] = [];
    private blockNumber: bigint | null = null;
    private poolsProviderData: GetPoolsResponse | null = null;

    constructor({
        chainId,
        options,
        poolDataProviders,
        rpcUrl,
        poolDataEnrichers = [],
        customPoolFactories = [],
    }: SorConfig) {
        this.chainId = chainId;
        this.router = new Router();
        this.poolParser = new PoolParser(chainId, customPoolFactories);
        this.poolDataService = new PoolDataService(
            Array.isArray(poolDataProviders) ? poolDataProviders : [poolDataProviders],
            Array.isArray(poolDataEnrichers) ? poolDataEnrichers : [poolDataEnrichers],
            rpcUrl,
        );
    }

    public async fetchAndCachePools(blockNumber?: bigint): Promise<BasePool[]> {
        const { rawPools, providerData } = await this.poolDataService.fetchEnrichedPools(
            blockNumber,
        );
        this.pools = this.poolParser.parseRawPools(rawPools);
        this.blockNumber = typeof blockNumber === 'bigint' ? blockNumber : null;
        this.poolsProviderData = providerData;

        return this.pools;
    }

    public async fetchAndCacheLatestPoolEnrichmentData(blockNumber?: bigint) {
        if (!this.poolsProviderData) {
            throw new Error(
                'fetchAndCacheLatestPoolEnrichmentData can only be called after a successful call to fetchAndCachePools',
            );
        }

        const providerOptions = {
            block: blockNumber,
            timestamp: await this.poolDataService.getTimestampForBlockNumber(blockNumber),
        };

        const enriched = await this.poolDataService.enrichPools(
            this.poolsProviderData,
            providerOptions,
        );
        this.pools = this.poolParser.parseRawPools(enriched);
    }

    public get isInitialized(): boolean {
        return this.pools.length > 0;
    }

    public async getSwaps(
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
        swapAmount: TokenAmount,
        swapOptions?: SwapOptions,
    ): Promise<SwapInfo> {
        checkInputs(tokenIn, tokenOut, swapKind, swapAmount);
        const candidatePaths = await this.getCandidatePaths(
            tokenIn,
            tokenOut,
            swapKind,
            swapOptions,
        );

        const bestPaths = this.router.getBestPaths(candidatePaths, swapKind, swapAmount);

        const swap = new Swap({ paths: bestPaths, swapKind });

        return {
            quote: swapKind === SwapKind.GivenIn ? swap.outputAmount : swap.inputAmount,
            swap,
        };
    }

    public async getCandidatePaths(
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
        options?: Pick<SwapOptions, 'block' | 'graphTraversalConfig'>,
    ): Promise<Path[]> {
        // fetch pools if we haven't yet, or if a block number is provided that doesn't match the existing.
        if (!this.isInitialized || (options?.block && options.block !== this.blockNumber)) {
            await this.fetchAndCachePools(options?.block);
        }

        return this.router.getCandidatePaths(
            tokenIn,
            tokenOut,
            swapKind,
            this.pools,
            options?.graphTraversalConfig,
        );
    }

    public static parseRawPools({
        chainId,
        pools,
        customPoolFactories = [],
    }: {
        chainId: number;
        pools: RawPool[];
        customPoolFactories?: BasePoolFactory[];
    }): BasePool[] {
        const poolParser = new PoolParser(chainId, customPoolFactories);

        return poolParser.parseRawPools(pools);
    }

    public static async getSwapsWithPools(
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
}
