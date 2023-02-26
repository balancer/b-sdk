import { PoolType, SwapKind } from '../../../types';
import { Token, TokenAmount, BigintIsh } from '../../';
import { BasePool } from '../';
import { MathSol, WAD, getPoolAddress, unsafeFastParseEther } from '../../../utils';
import { _calcOutGivenIn, _calcInGivenOut } from './math';
import { RawWeightedPool } from '../../../data/types';

class WeightedPoolToken extends TokenAmount {
    public readonly weight: bigint;
    public readonly index: number;

    public constructor(token: Token, amount: BigintIsh, weight: BigintIsh, index: number) {
        super(token, amount);
        this.weight = BigInt(weight);
        this.index = index;
    }
}

export class WeightedPool implements BasePool {
    public readonly id: string;
    public readonly address: string;
    public readonly poolType: PoolType = PoolType.Weighted;
    public readonly poolTypeVersion: number;
    public readonly swapFee: bigint;
    public readonly tokens: WeightedPoolToken[];

    private readonly tokenMap: Map<string, WeightedPoolToken>;
    private readonly MAX_IN_RATIO = 300000000000000000n; // 0.3
    private readonly MAX_OUT_RATIO = 300000000000000000n; // 0.3

    static fromRawPool(pool: RawWeightedPool): WeightedPool {
        const poolTokens: WeightedPoolToken[] = [];

        for (const t of pool.tokens) {
            if (!t.weight) {
                throw new Error('Weighted pool token does not have a weight');
            }

            const token = new Token(1, t.address, t.decimals, t.symbol, t.name);
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);

            poolTokens.push(
                new WeightedPoolToken(
                    token,
                    tokenAmount.amount,
                    unsafeFastParseEther(t.weight),
                    t.index,
                ),
            );
        }

        return new WeightedPool(
            pool.id,
            pool.poolTypeVersion,
            unsafeFastParseEther(pool.swapFee),
            poolTokens,
        );
    }

    constructor(id: string, poolTypeVersion: number, swapFee: bigint, tokens: WeightedPoolToken[]) {
        this.id = id;
        this.poolTypeVersion = poolTypeVersion;
        this.address = getPoolAddress(id);
        this.swapFee = swapFee;
        this.tokens = tokens;
        this.tokenMap = new Map(tokens.map(token => [token.token.address, token]));
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const { tIn, tOut } = this.getRequiredTokenPair(tokenIn, tokenOut);

        return (tIn.amount * tOut.weight) / (tIn.weight + tOut.weight);
    }

    public getLimitAmountSwap(tokenIn: Token, tokenOut: Token, swapKind: SwapKind): bigint {
        const { tIn, tOut } = this.getRequiredTokenPair(tokenIn, tokenOut);

        if (swapKind === SwapKind.GivenIn) {
            return (tIn.amount * this.MAX_IN_RATIO) / WAD;
        } else {
            return (tOut.amount * this.MAX_OUT_RATIO) / WAD;
        }
    }

    public swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        const { tIn, tOut } = this.getRequiredTokenPair(tokenIn, tokenOut);

        if (swapAmount.amount > this.getLimitAmountSwap(tokenIn, tokenOut, SwapKind.GivenIn)) {
            throw new Error('Swap amount exceeds the pool limit');
        }

        const amountWithFee = this.subtractSwapFeeAmount(swapAmount);

        const tokenOutScale18 = _calcOutGivenIn(
            tIn.scale18,
            tIn.weight,
            tOut.scale18,
            tOut.weight,
            amountWithFee.scale18,
            this.poolTypeVersion,
        );

        return TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);
    }

    public swapGivenOut(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
        mutateBalances?: boolean,
    ): TokenAmount {
        const { tIn, tOut } = this.getRequiredTokenPair(tokenIn, tokenOut);

        if (swapAmount.amount > this.getLimitAmountSwap(tokenIn, tokenOut, SwapKind.GivenOut)) {
            throw new Error('Swap amount exceeds the pool limit');
        }

        const tokenInScale18 = _calcInGivenOut(
            tIn.scale18,
            tIn.weight,
            tOut.scale18,
            tOut.weight,
            swapAmount.scale18,
            this.poolTypeVersion,
        );

        const tokenInAmount = TokenAmount.fromScale18Amount(tokenIn, tokenInScale18, true);

        return this.addSwapFeeAmount(tokenInAmount);
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulUpFixed(this.swapFee);
        return amount.sub(feeAmount);
    }

    public addSwapFeeAmount(amount: TokenAmount): TokenAmount {
        return amount.divUpFixed(MathSol.complementFixed(this.swapFee));
    }

    private getRequiredTokenPair(
        tokenIn: Token,
        tokenOut: Token,
    ): { tIn: WeightedPoolToken; tOut: WeightedPoolToken } {
        const tIn = this.tokenMap.get(tokenIn.address);
        const tOut = this.tokenMap.get(tokenOut.address);

        if (!tIn || !tOut) {
            throw new Error('Pool does not contain the tokens provided');
        }

        return { tIn, tOut };
    }
}
