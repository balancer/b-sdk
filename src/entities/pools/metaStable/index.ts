import { PoolType, SwapKind } from '../../../types';
import { BigintIsh, Token, TokenAmount } from '../../';
import { BasePool } from '../';
import { ALMOST_ONE, getPoolAddress, MathSol, unsafeFastParseEther, WAD } from '../../../utils';
import { _calcInGivenOut, _calcOutGivenIn, _calculateInvariant } from '../stable/math';
import { RawMetaStablePool } from '../../../data/types';

class StablePoolToken extends TokenAmount {
    public readonly rate: bigint;
    public readonly scale18: bigint;
    public readonly index: number;

    public constructor(token: Token, amount: BigintIsh, rate: BigintIsh, index: number) {
        super(token, amount);
        this.rate = BigInt(rate);
        this.scale18 = (this.amount * this.scalar * this.rate) / WAD;
        this.index = index;
    }
}

export class MetaStablePool implements BasePool {
    public readonly id: string;
    public readonly address: string;
    public readonly poolType: PoolType = PoolType.MetaStable;
    public readonly amp: bigint;
    public readonly swapFee: bigint;
    public readonly tokens: StablePoolToken[];

    private readonly tokenMap: Map<string, StablePoolToken>;
    private readonly tokenIndexMap: Map<string, number>;

    static fromRawPool(pool: RawMetaStablePool): MetaStablePool {
        const poolTokens: StablePoolToken[] = [];

        for (const t of pool.tokens) {
            if (!t.priceRate) throw new Error('Meta Stable pool token does not have a price rate');
            const token = new Token(1, t.address, t.decimals, t.symbol, t.name);
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);
            poolTokens.push(
                new StablePoolToken(
                    token,
                    tokenAmount.amount,
                    unsafeFastParseEther(t.priceRate),
                    t.index,
                ),
            );
        }

        const amp = BigInt(pool.amp) * 1000n;

        return new MetaStablePool(pool.id, amp, unsafeFastParseEther(pool.swapFee), poolTokens);
    }

    constructor(id: string, amp: bigint, swapFee: bigint, tokens: StablePoolToken[]) {
        this.id = id;
        this.address = getPoolAddress(id);
        this.amp = amp;
        this.swapFee = swapFee;

        this.tokens = tokens.sort((a, b) => a.index - b.index);
        this.tokenMap = new Map(this.tokens.map(token => [token.token.address, token]));
        this.tokenIndexMap = new Map(this.tokens.map(token => [token.token.address, token.index]));
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const tIn = this.tokenMap.get(tokenIn.address);
        const tOut = this.tokenMap.get(tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
        // TODO: Fix stable normalized liquidity calc
        return tOut.amount * this.amp;
    }

    public swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        const tInIndex = this.tokenIndexMap.get(tokenIn.address);
        const tOutIndex = this.tokenIndexMap.get(tokenOut.address);

        if (typeof tInIndex !== 'number' || typeof tOutIndex !== 'number') {
            throw new Error('Pool does not contain the tokens provided');
        }

        if (swapAmount.amount > this.tokens[tInIndex].amount) {
            throw new Error('Swap amount exceeds the pool limit');
        }

        const amountInWithFee = this.subtractSwapFeeAmount(swapAmount);
        const amountInWithRate = amountInWithFee.mulDownFixed(this.tokens[tInIndex].rate);
        const balances = this.tokens.map(t => t.scale18);

        const invariant = _calculateInvariant(this.amp, [...balances], true);

        const tokenOutScale18 = _calcOutGivenIn(
            this.amp,
            [...balances],
            tInIndex,
            tOutIndex,
            amountInWithRate.scale18,
            invariant,
        );

        const amountOut = TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);

        return amountOut.divDownFixed(this.tokens[tOutIndex].rate);
    }

    public swapGivenOut(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        const tInIndex = this.tokenIndexMap.get(tokenIn.address);
        const tOutIndex = this.tokenIndexMap.get(tokenOut.address);

        if (typeof tInIndex !== 'number' || typeof tOutIndex !== 'number') {
            throw new Error('Pool does not contain the tokens provided');
        }

        if (swapAmount.amount > this.tokens[tOutIndex].amount) {
            throw new Error('Swap amount exceeds the pool limit');
        }

        const amountOutWithRate = swapAmount.mulDownFixed(this.tokens[tOutIndex].rate);

        const balances = this.tokens.map(t => t.scale18);

        const invariant = _calculateInvariant(this.amp, balances, true);

        const tokenInScale18 = _calcInGivenOut(
            this.amp,
            [...balances],
            tInIndex,
            tOutIndex,
            amountOutWithRate.scale18,
            invariant,
        );

        const amountIn = TokenAmount.fromScale18Amount(tokenIn, tokenInScale18, true);
        const amountInWithFee = this.addSwapFeeAmount(amountIn);

        return amountInWithFee.divDownFixed(this.tokens[tInIndex].rate);
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulUpFixed(this.swapFee);
        return amount.sub(feeAmount);
    }

    public addSwapFeeAmount(amount: TokenAmount): TokenAmount {
        return amount.divUpFixed(MathSol.complementFixed(this.swapFee));
    }

    public getLimitAmountSwap(tokenIn: Token, tokenOut: Token, swapKind: SwapKind): bigint {
        const tIn = this.tokenMap.get(tokenIn.address);
        const tOut = this.tokenMap.get(tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');

        if (swapKind === SwapKind.GivenIn) {
            // Return max valid amount of tokenIn
            // As an approx - use almost the total balance of token out as we can add any amount of tokenIn and expect some back
            return (tIn.amount * ALMOST_ONE) / tIn.rate;
        } else {
            // Return max amount of tokenOut - approx is almost all balance
            return (tOut.amount * ALMOST_ONE) / tOut.rate;
        }
    }
}
