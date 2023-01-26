import { BigNumber } from '@ethersproject/bignumber';
import { BaseProvider } from '@ethersproject/providers';
import { Router } from './router';
import { Swap, Token, TokenAmount } from './entities';
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
        );
    }

    async getSwaps(
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
        swapAmount: TokenAmount,
        swapOptions?: SwapOptions,
    ): Promise<SwapInfo> {
        console.time('poolProvider');
        const rawPools = await this.poolDataService.getEnrichedPools(swapOptions);
        console.timeEnd('poolProvider');

        console.time('poolParser');
        const pools = this.poolParser.parseRawPools(rawPools);
        console.timeEnd('poolParser');

        console.time('getCandidatePaths');
        const candidatePaths = this.router.getCandidatePaths(tokenIn, tokenOut, swapKind, pools);
        console.timeEnd('getCandidatePaths');

        console.time('bestPaths');
        const bestPaths = await this.router.getBestPaths(candidatePaths, swapKind, swapAmount);
        console.timeEnd('bestPaths');

        const swapInfo = {
            quote: swapKind === SwapKind.GivenIn ? bestPaths.outputAmount : bestPaths.inputAmount,
            swap: bestPaths,
        };

        return swapInfo;
    }
}
