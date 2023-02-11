import { PoolType, SwapKind } from '../../../types';
import { Token, TokenAmount, BigintIsh } from '../../';
import { BasePool } from '../';
import { MathSol, WAD, getPoolAddress, unsafeFastParseEther } from '../../../utils';
import { _calculateInvariant, _calcOutGivenIn, _calcInGivenOut } from '../stable/math';
import { RawMetaStablePool } from '../../../data/types';

const ALMOST_ONE = unsafeFastParseEther('0.99');

export class StablePoolToken extends TokenAmount {
    public readonly rate: bigint;
    public readonly scale18: bigint;

    public constructor(token: Token, amount: BigintIsh, rate: BigintIsh) {
        super(token, amount);
        this.rate = BigInt(rate);
        this.scale18 = (this.amount * this.scalar * this.rate) / WAD;
    }
}

export class MetaStablePool implements BasePool {
    readonly id: string;
    readonly address: string;
    readonly poolType: PoolType = PoolType.MetaStable;
    amp: bigint;
    swapFee: bigint;
    tokens: StablePoolToken[];

    static fromRawPool(pool: RawMetaStablePool): MetaStablePool {
        const orderedTokens = pool.tokens.sort((a, b) => a.index - b.index);
        const poolTokens = orderedTokens.map(t => {
            if (!t.priceRate) throw new Error('Meta Stable pool token does not have a price rate');
            const token = new Token(1, t.address, t.decimals, t.symbol, t.name);
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);
            return new StablePoolToken(
                token,
                tokenAmount.amount,
                unsafeFastParseEther(t.priceRate),
            );
        });
        const amp = BigInt(pool.amp) * 1000n;
        const stablePool = new MetaStablePool(
            pool.id,
            amp,
            unsafeFastParseEther(pool.swapFee),
            poolTokens,
        );
        return stablePool;
    }

    constructor(id: string, amp: bigint, swapFee: bigint, tokens: StablePoolToken[]) {
        this.id = id;
        this.tokens = tokens;
        this.address = getPoolAddress(id);
        this.amp = amp;
        this.swapFee = swapFee;
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
        // TODO: Fix stable normalized liquidity calc
        return tOut.amount * this.amp;
    }

    public swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        const tInIndex = this.tokens.findIndex(t => t.token.address === tokenIn.address);
        const tOutIndex = this.tokens.findIndex(t => t.token.address === tokenOut.address);

        if (tInIndex < 0 || tOutIndex < 0)
            throw new Error('Pool does not contain the tokens provided');

        if (swapAmount.amount > this.tokens[tInIndex].amount)
            throw new Error('Swap amount exceeds the pool limit');

        const amountInWithFee = this.subtractSwapFeeAmount(swapAmount);
        const amountInWithRate = amountInWithFee.mulFixed(this.tokens[tInIndex].rate);
        const balances = this.tokens.map(t => t.scale18);

        const invariant = _calculateInvariant(this.amp, balances);

        const tokenOutScale18 = _calcOutGivenIn(
            this.amp,
            [...balances],
            tInIndex,
            tOutIndex,
            amountInWithRate.scale18,
            invariant,
        );

        const amountOut = TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);
        const amountOutWithRate = amountOut.divDownFixed(this.tokens[tOutIndex].rate);

        return amountOutWithRate;
    }

    public swapGivenOut(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        const tInIndex = this.tokens.findIndex(t => t.token.address === tokenIn.address);
        const tOutIndex = this.tokens.findIndex(t => t.token.address === tokenOut.address);

        if (tInIndex < 0 || tOutIndex < 0)
            throw new Error('Pool does not contain the tokens provided');

        if (swapAmount.amount > this.tokens[tOutIndex].amount)
            throw new Error('Swap amount exceeds the pool limit');

        const amountOutWithRate = swapAmount.mulFixed(this.tokens[tOutIndex].rate);

        const balances = this.tokens.map(t => t.scale18);

        const invariant = _calculateInvariant(this.amp, balances);

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
        const amountInWithRate = amountInWithFee.divDownFixed(this.tokens[tInIndex].rate);

        return amountInWithRate;
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulFixed(this.swapFee);
        return amount.sub(feeAmount);
    }

    public addSwapFeeAmount(amount: TokenAmount): TokenAmount {
        return amount.divUpFixed(MathSol.complementFixed(this.swapFee));
    }

    public getLimitAmountSwap(tokenIn: Token, tokenOut: Token, swapKind: SwapKind): bigint {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

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
