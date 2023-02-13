import { BaseProvider } from '@ethersproject/providers';
import { Router } from './router';
import { BasePool, Path, Token, TokenAmount } from './entities';
import { ChainId } from './utils';
import { SorConfig, SwapInfo, SwapKind, SwapOptions } from './types';
import { PoolParser } from './entities/pools/parser';
import { PoolDataService } from './data/poolDataService';
import { GetPoolsResponse } from './data/types';

export class SmartOrderRouter {
    private readonly chainId: ChainId;
    private readonly provider: BaseProvider;
    private readonly router: Router;
    private readonly poolParser: PoolParser;
    private readonly poolDataService: PoolDataService;
    private pools: BasePool[] = [];
    private blockNumber: number | null = null;
    private poolsProviderData: GetPoolsResponse | null = null;

    constructor({
        chainId,
        provider,
        options,
        poolDataProviders,
        rpcUrl,
        poolDataEnrichers = [],
        customPoolFactories = [],
    }: SorConfig) {
        this.chainId = chainId;
        this.provider = provider;
        this.router = new Router();
        this.poolParser = new PoolParser(customPoolFactories);
        this.poolDataService = new PoolDataService(
            Array.isArray(poolDataProviders) ? poolDataProviders : [poolDataProviders],
            Array.isArray(poolDataEnrichers) ? poolDataEnrichers : [poolDataEnrichers],
            rpcUrl,
        );
    }

    public async fetchAndCachePools(blockNumber?: number): Promise<void> {
        const { rawPools, providerData } = await this.poolDataService.fetchEnrichedPools(
            blockNumber,
        );
        this.pools = this.poolParser.parseRawPools(rawPools);
        this.blockNumber = typeof blockNumber === 'number' ? blockNumber : null;
        this.poolsProviderData = providerData;
    }

    public async fetchAndCacheLatestPoolEnrichmentData(blockNumber?: number) {
        if (!this.poolsProviderData) {
            throw new Error(
                'fetchAndCacheLatestPoolEnrichmentData can only be called after a successful call to fetchAndCachePools',
            );
        }

        const providerOptions = {
            block: blockNumber,
            timestamp: await this.poolDataService.getTimestampForBlockNumber(blockNumber),
        };

        await this.poolDataService.enrichPools(this.poolsProviderData, providerOptions);
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
        const candidatePaths = await this.getCandidatePaths(
            tokenIn,
            tokenOut,
            swapKind,
            swapOptions,
        );
        const bestPaths = await this.router.getBestPaths(candidatePaths, swapKind, swapAmount);

        return {
            quote: swapKind === SwapKind.GivenIn ? bestPaths.outputAmount : bestPaths.inputAmount,
            swap: bestPaths,
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
}
