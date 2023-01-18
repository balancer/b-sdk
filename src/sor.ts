import { BigNumber } from '@ethersproject/bignumber';
import { BaseProvider } from '@ethersproject/providers';
import { PoolDataService } from './poolProvider';
import { Router } from './router';
import { Swap, Token, TokenAmount, Path } from './entities';
import { ChainId } from './utils';
import { SwapKind, SorConfig } from './types';
import { PoolParser } from './entities/pool/poolParser';

export interface FundManagement {
    sender: string;
    fromInternalBalance: boolean;
    recipient: boolean;
    toInternalBalance: boolean;
}

export interface SwapOptions {
    slippage: BigNumber;
    funds: FundManagement;
    deadline: BigNumber;
}

export interface PathWithAmount {
    path: Path;
    inputAmount: TokenAmount;
    outputAmount: TokenAmount;
}

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
    private readonly poolProvider: PoolDataService;
    public readonly router: Router;
<<<<<<< HEAD
    private readonly poolParser: PoolParser;

  constructor({
    chainId,
    provider,
    poolProvider,
    options,
        customPoolFactories = [],
  }: SorConfig) {
    this.chainId = chainId;
    this.provider = provider;
    this.poolProvider = poolProvider;
    this.router = new Router();
        this.poolParser = new PoolParser(customPoolFactories);
  }
=======

    constructor({ chainId, provider, poolProvider, options }: SorConfig) {
        this.chainId = chainId;
        this.provider = provider;
        this.poolProvider = poolProvider;
        this.router = new Router();
    }
>>>>>>> 7fa57c9 (onchain query and multiple math libs)

    async getSwaps(
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
        swapAmount: TokenAmount,
        swapOptions?: SwapOptions,
    ): Promise<SwapInfo> {
        console.time('poolProvider');
<<<<<<< HEAD
        const rawPools = await this.poolProvider.getPools();
        console.timeEnd('poolProvider');

        console.time('poolParser');
        const pools = this.poolParser.parseRawPools(rawPools);
        console.timeEnd('poolParser');
=======
        const pools = await this.poolProvider.getPools(swapOptions);
        console.timeEnd('poolProvider');
>>>>>>> 7fa57c9 (onchain query and multiple math libs)

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
