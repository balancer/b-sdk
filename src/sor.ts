import { BigNumber } from '@ethersproject/bignumber';
import { BaseProvider } from '@ethersproject/providers';
import { Router } from './router';
import { BasePool, Swap, Token, TokenAmount } from './entities';
import { ChainId } from './utils';
import { SorConfig, SwapKind, SwapOptions } from './types';
import { PoolParser } from './entities/pools/parser';
import { PoolDataService } from './data/poolDataService';

export interface SwapInfo {
    quote: TokenAmount;
    swap: Swap;
    // gasPriceWei: BigNumber;
    // estimateTxGas: BigNumber;
    // transactionData: TransactionData;
}

export type TransactionData = {
    calldata: string;
    value: BigNumber;
};

export class SmartOrderRouter {
    public chainId: ChainId;
    public provider: BaseProvider;
    public readonly router: Router;
    private readonly poolParser: PoolParser;
    private readonly poolDataService: PoolDataService;

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

    public async getSwaps(
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
        swapAmount: TokenAmount,
        swapOptions?: SwapOptions,
    ): Promise<SwapInfo> {
        const rawPools = await this.poolDataService.getEnrichedPools(swapOptions || {});
        const pools = this.poolParser.parseRawPools(rawPools);

        const candidatePaths = this.router.getCandidatePaths(tokenIn, tokenOut, swapKind, pools);
        const bestPaths = await this.router.getBestPaths(candidatePaths, swapKind, swapAmount);

        const swapInfo = {
            quote: swapKind === SwapKind.GivenIn ? bestPaths.outputAmount : bestPaths.inputAmount,
            swap: bestPaths,
        };

        return swapInfo;
    }

    public async getSwapsWithPools(
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
        swapAmount: TokenAmount,
        pools: BasePool[],
        swapOptions?: SwapOptions,
    ): Promise<SwapInfo> {
        const candidatePaths = this.router.getCandidatePaths(tokenIn, tokenOut, swapKind, pools);
        const bestPaths = await this.router.getBestPaths(candidatePaths, swapKind, swapAmount);

        const swapInfo = {
            quote: swapKind === SwapKind.GivenIn ? bestPaths.outputAmount : bestPaths.inputAmount,
            swap: bestPaths,
        };

        return swapInfo;
    }

    public async fetchPools(swapOptions?: SwapOptions): Promise<BasePool[]> {
        const rawPools = await this.poolDataService.getEnrichedPools(swapOptions || {});
        const pools = this.poolParser.parseRawPools(rawPools);
        return pools;
    }
}
