import { PoolType } from '../../types';
import { Token, TokenAmount } from '../';

export interface BasePool {
  poolType: PoolType;
  id: string;
  address: string;
  swapFee: bigint;
  tokens: TokenAmount[];
  getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint;
  swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount;
}