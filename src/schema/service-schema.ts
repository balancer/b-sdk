import { Token } from "../entities";
import { Address, BalancerBasePool, Decimal } from "./pool-schema";
import { BatchSwapStep, SwapKind } from "../types";

//TODO: should we pass in the class instances here or is an object easier to maange?
interface TokenAmount {
  address: Address;
  amount: BigInt;
  decimals: number; //TODO: is this needed?
}

export interface PoolService {
  supportsPool(pool: BalancerBasePool): boolean;
  supportsProportional(pool: BalancerBasePool): boolean;

  // given an array of token balances, determine the max proportional investable amount
  getMaxProportionalForUserBalances(
    pool: BalancerBasePool,
    userInvestTokenBalances: TokenAmount[]
  ): Promise<TokenAmount[]>;

  getProportionalSuggestionForFixedAmount(
    pool: BalancerBasePool,
    fixedAmount: TokenAmount,
    tokensIn: Token[]
  ): Promise<TokenAmount[]>;

  getBptOutAndPriceImpactForTokensIn(
    pool: BalancerBasePool,
    tokenAmountsIn: TokenAmount[]
  ): Promise<BalancerJoinBptOutAndPriceImpactForTokensInOutput>;

  getContractCallData(
    pool: BalancerBasePool,
    data: PoolJoinData
  ): Promise<PoolJoinContractCallData>;
}

export type PoolJoinData =
  | PoolJoinInit
  | PoolJoinExactTokensInForBPTOut
  | PoolJoinTokenInForExactBPTOut
  | PoolJoinAllTokensInForExactBPTOut;

interface PoolJoinBase {
  maxAmountsIn: TokenAmount[];
  zapIntoMasterchefFarm?: boolean;
  zapIntoGauge?: boolean;
  userAddress: string;
  wethIsEth: boolean;
  slippage: string;
}

export interface PoolJoinInit extends PoolJoinBase {
  kind: "Init";
  tokenAmountsIn: TokenAmount[];
}

export interface PoolJoinExactTokensInForBPTOut extends PoolJoinBase {
  kind: "ExactTokensInForBPTOut";
  tokenAmountsIn: TokenAmount[];
  minimumBpt: BigInt;
}

export interface PoolJoinTokenInForExactBPTOut extends PoolJoinBase {
  kind: "TokenInForExactBPTOut";
  tokenInAddress: string;
  bptAmountOut: BigInt;
}

export interface PoolJoinAllTokensInForExactBPTOut extends PoolJoinBase {
  kind: "AllTokensInForExactBPTOut";
  bptAmountOut: BigInt;
}

export type PoolJoinContractCallData =
  | PoolJoinPoolContractCallData
  | PoolJoinBatchSwapContractCallData
  | PoolJoinBatchRelayerContractCallData;

export interface PoolJoinPoolContractCallData {
  type: "JoinPool";
  assets: string[];
  maxAmountsIn: BigInt[];
  userData: string;
}

export interface PoolJoinBatchSwapContractCallData {
  type: "BatchSwap";
  kind: SwapKind;
  swaps: BatchSwapStep[];
  assets: string[];
  limits: BigInt[];
}

export interface PoolJoinBatchRelayerContractCallData {
  type: "BatchRelayer";
  calls: string[];
  ethValue?: string;
}

export interface BalancerJoinBptOutAndPriceImpactForTokensInOutput {
  minBptReceived: BigInt;
  priceImpactPercent: Decimal;
}
