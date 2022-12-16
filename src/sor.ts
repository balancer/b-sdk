import { BigNumber } from '@ethersproject/bignumber';
import { BaseProvider } from '@ethersproject/providers';
import { SubgraphProvider } from './poolProvider';
import { getCandidatePaths, getBestPaths } from './router';
import { Swap, Token, TokenAmount, Path } from './entities';
import { ChainId } from './utils';
import {
  SwapKind,
  SorConfig
} from './types';

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
  paths: PathWithAmount[];
  // gasPriceWei: BigNumber;
  // estimateTxGas: BigNumber;
  // transactionData: TransactionData;
}

export type TransactionData = {
  calldata: string;
  value: BigNumber;
}

export class Sor {
  public chainId: ChainId;
  // public provider: BaseProvider;
  private readonly poolProvider: SubgraphProvider;
  // public readonly routeProposer: RouteProposer;

  constructor({
    chainId,
    // provider,
    poolProvider,
    options,
  }: SorConfig) {
    this.chainId = chainId;
    // this.provider = provider;
    this.poolProvider = poolProvider;
    // this.routeProposer = new RouteProposer();
  }

  async getSwaps(
    tokenIn: Token,
    tokenOut: Token,
    swapKind: SwapKind,
    swapAmount: TokenAmount,
    swapOptions?: SwapOptions
  ): Promise<SwapInfo> {

    // Pool data is kept raw and uses subgraph balances for potential routes
    // and then later parsed into a Pool class to fetch onchain balances
    const pools = await this.poolProvider.getPools();

    const candidatePaths = getCandidatePaths(
      tokenIn,
      tokenOut,
      swapKind,
      pools,
    );

    const bestPaths = await getBestPaths(
      candidatePaths,
      swapKind,
      swapAmount,
    );

    const swapInfo = {
      quote: swapAmount,
      swap: bestPaths,
      paths: bestPaths.paths
    }

    return swapInfo;
  }
}
