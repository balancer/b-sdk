import { PoolType, SwapKind } from '@/types';
import { Token, TokenAmount, BigintIsh } from '@/entities/';
import { BasePool } from '@/entities/pools';
import { MathSol, WAD, getPoolAddress, unsafeFastParseEther } from '@/utils';
import { _calcOutGivenIn, _calcInGivenOut } from './math';
import { RawPool, RawWeightedPool } from '@/data/types';

export class WeightedPoolToken extends TokenAmount {
    public readonly weight: bigint;

    public constructor(token: Token, amount: BigintIsh, weight: BigintIsh) {
        super(token, amount);
        this.weight = BigInt(weight);
    }
}

export class WeightedPool implements BasePool {
    id: string;
    address: string;
    poolType: PoolType = PoolType.Weighted;
    poolTypeVersion: number;
    swapFee: bigint;
    tokens: WeightedPoolToken[];
    MAX_IN_RATIO = 300000000000000000n; // 0.3
    MAX_OUT_RATIO = 300000000000000000n; // 0.3

    static fromRawPool(pool: RawWeightedPool): WeightedPool {
        const poolTokens = pool.tokens.map(t => {
            if (!t.weight) throw new Error('Weighted pool token does not have a weight');
            const token = new Token(1, t.address, t.decimals, t.symbol, t.name);
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);

            return new WeightedPoolToken(token, tokenAmount.amount, unsafeFastParseEther(t.weight));
        });
        const weightedPool = new WeightedPool(
            pool.id,
            pool.poolTypeVersion,
            BigInt(unsafeFastParseEther(pool.swapFee)),
            poolTokens,
        );
        return weightedPool;
    }

    constructor(id: string, poolTypeVersion: number, swapFee: bigint, tokens: WeightedPoolToken[]) {
        this.id = id;
        this.poolTypeVersion = poolTypeVersion;
        this.tokens = tokens;
        this.address = getPoolAddress(id);
        this.swapFee = swapFee;
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
        return (tIn.amount * tOut.weight) / (tIn.weight + tOut.weight);
    }

    public getLimitAmountSwap(tokenIn: Token, tokenOut: Token, swapKind: SwapKind): bigint {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');

        if (swapKind === SwapKind.GivenIn) {
            return (tIn.amount * this.MAX_IN_RATIO) / WAD;
        } else {
            return (tOut.amount * this.MAX_OUT_RATIO) / WAD;
        }
    }

    public swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
        if (swapAmount.amount > this.getLimitAmountSwap(tokenIn, tokenOut, SwapKind.GivenIn))
            throw new Error('Swap amount exceeds the pool limit');

        const amountWithFee = this.subtractSwapFeeAmount(swapAmount);

        const tokenOutScale18 = _calcOutGivenIn(
            tIn.scale18,
            tIn.weight,
            tOut.scale18,
            tOut.weight,
            amountWithFee.scale18,
            this.poolTypeVersion,
        );

        const tokenOutAmount = TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);

        return tokenOutAmount;
    }

    public swapGivenOut(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
        if (swapAmount.amount > this.getLimitAmountSwap(tokenIn, tokenOut, SwapKind.GivenOut))
            throw new Error('Swap amount exceeds the pool limit');

        const tokenInScale18 = _calcInGivenOut(
            tIn.scale18,
            tIn.weight,
            tOut.scale18,
            tOut.weight,
            swapAmount.scale18,
            this.poolTypeVersion,
        );

        const tokenInAmount = TokenAmount.fromScale18Amount(tokenIn, tokenInScale18);
        const amountWithFee = this.addSwapFeeAmount(tokenInAmount);

        return amountWithFee;
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulFixed(this.swapFee);
        return amount.sub(feeAmount);
    }

    public addSwapFeeAmount(amount: TokenAmount): TokenAmount {
        return amount.divFixed(MathSol.complementFixed(this.swapFee));
    }
}
