import { BigNumber } from '@ethersproject/bignumber';
import { BaseProvider } from '@ethersproject/providers';
import { PoolDataService, SubgraphPool } from './poolProvider';
import { Router } from './router';
import { Swap, Token, TokenAmount, Path } from './entities';
import { ChainId } from './utils';
import { SwapKind, SwapOptions, SorConfig } from './types';
import { PoolParser } from './entities/pool/poolParser';

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
    private readonly poolProviders: PoolDataService[];
    public readonly router: Router;
    private readonly poolParser: PoolParser;

    constructor({ chainId, provider, poolProvider, options, customPoolFactories = [] }: SorConfig) {
        this.chainId = chainId;
        this.provider = provider;
        this.poolProviders = Array.isArray(poolProvider) ? poolProvider : [poolProvider];
        this.router = new Router();
        this.poolParser = new PoolParser(customPoolFactories);
    }

    async getSwaps(
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
        swapAmount: TokenAmount,
        swapOptions?: SwapOptions,
    ): Promise<SwapInfo> {
        console.time('poolProvider');
        const rawPools = await this.loadPools(swapOptions);
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

    private async loadPools(swapOptions?: SwapOptions): Promise<SubgraphPool[]> {
        const responses = await Promise.all(
            this.poolProviders.map(provider => provider.getPools(swapOptions)),
        );

        return responses.flat();
    }
}
