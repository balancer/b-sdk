import { parseEther } from '@ethersproject/units';
import { PoolType, SwapKind } from '../../types';
import { Token, TokenAmount, TokenAmountWeight } from '../../entities/';
import { BasePool } from './';
import { SubgraphPool } from '../../poolProvider';
import { BONE } from '../../utils';
import { _calcOutGivenIn } from './weightedMath';

export class WeightedPool implements BasePool {
  id: string;
  address: string;
  poolType: PoolType = PoolType.Weighted;
  swapFee: bigint;
  tokens: TokenAmountWeight[];
  MAX_IN_RATIO = BigInt('300000000000000000'); // 0.3
  MAX_OUT_RATIO = BigInt('300000000000000000'); // 0.3

  static fromRawPool(pool: SubgraphPool): WeightedPool {
    const poolTokens = pool.tokens.map(t=> {
      const token = new Token(1, t.address, t.decimals, t.symbol, t.name);
      const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);
      // TODO Fix weight parse hack
      return new TokenAmountWeight(token, tokenAmount.amount, parseEther((Number(t.weight) * 100).toString()).toString());
    });
    const weightedPool = new WeightedPool(
        pool.id,
        BigInt(parseEther(pool.swapFee).toString()),
        poolTokens
    );
    return weightedPool;
}

  constructor(id: string, swapFee: bigint, tokens: TokenAmountWeight[]) {
    this.id = id;
    this.tokens = tokens;
    this.address = id;
    this.swapFee = swapFee;
  }

  public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
    const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
    const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

    if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
    return ((tIn.amount * tOut.weight)) / (tIn.weight + tOut.weight);
  }

  public getLimitAmountSwap(
    tokenIn: Token,
    tokenOut: Token,
    swapKind: SwapKind
  ): bigint {
    const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
    const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

    if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');

    if (swapKind === SwapKind.GivenIn) {
      return tIn.amount * this.MAX_IN_RATIO / BONE;
    } else {
      return tOut.amount * this.MAX_OUT_RATIO / BONE;
    }
  }

  public swapGivenIn(
    tokenIn: Token,
    tokenOut: Token,
    swapAmount: TokenAmount
  ): TokenAmount {
    const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
    const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

    if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');

    const amountWithFee = this.subtractSwapFeeAmount(swapAmount);

    const tokenOutScale18 = _calcOutGivenIn(
      tIn.scale18,
      tIn.weight,
      tOut.scale18,
      tOut.weight,
      amountWithFee.scale18
    );

    return TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);
  }

  public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
    const feeAmount = amount.mulFixed(this.swapFee);
    return amount.sub(feeAmount);
  }
}
