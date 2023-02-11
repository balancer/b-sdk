import { PoolType, SwapKind } from '../../../types';
import { Token, TokenAmount, BigintIsh } from '../../';
import { BasePool } from '../';
import {
    MathSol,
    PREMINTED_STABLE_BPT,
    WAD,
    getPoolAddress,
    unsafeFastParseEther,
} from '../../../utils';
import {
    _calculateInvariant,
    _calcOutGivenIn,
    _calcInGivenOut,
    _calcBptOutGivenExactTokensIn,
    _calcTokenInGivenExactBptOut,
    _calcBptInGivenExactTokensOut,
    _calcTokenOutGivenExactBptIn,
} from './math';
import { RawComposableStablePool } from '../../../data/types';

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

export class BPT extends TokenAmount {
    public readonly rate: bigint;
    public readonly virtualBalance: bigint;

    public constructor(token: Token, amount: BigintIsh) {
        super(token, amount);
        this.rate = WAD;
        this.virtualBalance = PREMINTED_STABLE_BPT - this.amount;
    }
}
export class StablePool implements BasePool {
    readonly id: string;
    readonly address: string;
    readonly poolType: PoolType = PoolType.ComposableStable;
    amp: bigint;
    swapFee: bigint;
    tokens: (StablePoolToken | BPT)[];
    tokensNoBpt: StablePoolToken[];
    totalShares: bigint;
    readonly bptIndex: number;

    static fromRawPool(pool: RawComposableStablePool): StablePool {
        const orderedTokens = pool.tokens.sort((a, b) => a.index - b.index);
        const poolTokens = orderedTokens.map(t => {
            if (!t.priceRate) throw new Error('Stable pool token does not have a price rate');
            const token = new Token(1, t.address, t.decimals, t.symbol, t.name);
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);
            if (t.address === pool.address) {
                return new BPT(token, tokenAmount.amount);
            } else {
                return new StablePoolToken(
                    token,
                    tokenAmount.amount,
                    unsafeFastParseEther(t.priceRate),
                );
            }
        });
        const totalShares = unsafeFastParseEther(pool.totalShares);
        const amp = BigInt(pool.amp) * 1000n;
        const stablePool = new StablePool(
            pool.id,
            amp,
            unsafeFastParseEther(pool.swapFee),
            poolTokens,
            totalShares,
        );
        return stablePool;
    }

    constructor(
        id: string,
        amp: bigint,
        swapFee: bigint,
        tokens: StablePoolToken[],
        totalShares: bigint,
    ) {
        this.id = id;
        this.tokens = tokens;
        this.address = getPoolAddress(id);
        this.amp = amp;
        this.swapFee = swapFee;
        this.bptIndex = tokens.findIndex(t => t.token.address === this.address);
        this.tokensNoBpt = [...tokens];
        this.tokensNoBpt.splice(this.bptIndex, 1);
        this.totalShares = totalShares;
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
        // TODO: Fix stable normalized liquidity calc
        return tOut.amount * this.amp;
    }

    public swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        if (tokenIn === this.tokens[this.bptIndex].token) {
            return this._exitSwapExactBptInForTokenOut(tokenIn, tokenOut, swapAmount);
        } else if (tokenOut === this.tokens[this.bptIndex].token) {
            return this._joinSwapExactTokenInForBptOut(tokenIn, tokenOut, swapAmount);
        } else {
            const tInIndex = this.tokensNoBpt.findIndex(t => t.token.address === tokenIn.address);
            const tOutIndex = this.tokensNoBpt.findIndex(t => t.token.address === tokenOut.address);

            if (tInIndex < 0 || tOutIndex < 0)
                throw new Error('Pool does not contain the tokens provided');

            if (swapAmount.amount > this.tokensNoBpt[tInIndex].amount)
                throw new Error('Swap amount exceeds the pool limit');

            const amountInWithFee = this.subtractSwapFeeAmount(swapAmount);
            const amountInWithRate = amountInWithFee.mulDownFixed(this.tokensNoBpt[tInIndex].rate);
            const balancesNoBpt = this.tokensNoBpt.map(t => t.scale18);

            const invariant = _calculateInvariant(this.amp, balancesNoBpt);

            const tokenOutScale18 = _calcOutGivenIn(
                this.amp,
                [...balancesNoBpt],
                tInIndex,
                tOutIndex,
                amountInWithRate.scale18,
                invariant,
            );

            const amountOut = TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);
            const amountOutWithRate = amountOut.divDownFixed(this.tokensNoBpt[tOutIndex].rate);

            return amountOutWithRate;
        }
    }

    public swapGivenOut(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        if (tokenIn === this.tokens[this.bptIndex].token) {
            return this._exitSwapExactTokenOutForBptIn(tokenIn, tokenOut, swapAmount);
        } else if (tokenOut === this.tokens[this.bptIndex].token) {
            return this._joinSwapExactBptOutForTokenIn(tokenIn, tokenOut, swapAmount);
        } else {
            const tInIndex = this.tokensNoBpt.findIndex(t => t.token.address === tokenIn.address);
            const tOutIndex = this.tokensNoBpt.findIndex(t => t.token.address === tokenOut.address);
            if (tInIndex < 0 || tOutIndex < 0)
                throw new Error('Pool does not contain the tokens provided');

            if (swapAmount.amount > this.tokensNoBpt[tOutIndex].amount)
                throw new Error('Swap amount exceeds the pool limit');

            const amountOutWithRate = swapAmount.mulDownFixed(this.tokensNoBpt[tOutIndex].rate);

            const balancesNoBpt = this.tokensNoBpt.map(t => t.scale18);

            const invariant = _calculateInvariant(this.amp, balancesNoBpt);

            const tokenInScale18 = _calcInGivenOut(
                this.amp,
                [...balancesNoBpt],
                tInIndex,
                tOutIndex,
                amountOutWithRate.scale18,
                invariant,
            );

            const amountIn = TokenAmount.fromScale18Amount(tokenIn, tokenInScale18, true);
            const amountInWithFee = this.addSwapFeeAmount(amountIn);
            const amountInWithRate = amountInWithFee.divDownFixed(this.tokensNoBpt[tInIndex].rate);

            return amountInWithRate;
        }
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulUpFixed(this.swapFee);
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

    private _joinSwapExactTokenInForBptOut(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
    ): TokenAmount {
        const tInIndex = this.tokensNoBpt.findIndex(t => t.token.address === tokenIn.address);
        const amountsIn = new Array(this.tokensNoBpt.length).fill(0n);

        const amountInWithRate = swapAmount.mulDownFixed(this.tokensNoBpt[tInIndex].rate);
        amountsIn[tInIndex] = amountInWithRate.scale18;

        const balancesNoBpt = this.tokensNoBpt.map(t => t.scale18);

        const invariant = _calculateInvariant(this.amp, balancesNoBpt);

        const tokenOutScale18 = _calcBptOutGivenExactTokensIn(
            this.amp,
            [...balancesNoBpt],
            amountsIn,
            this.totalShares,
            invariant,
            this.swapFee,
        );

        const amountOut = TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);
        const amountOutWithRate = amountOut.divDownFixed(this.tokens[this.bptIndex].rate);

        return amountOutWithRate;
    }

    private _joinSwapExactBptOutForTokenIn(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
    ): TokenAmount {
        const tInIndex = this.tokensNoBpt.findIndex(
            t => t.token.address === swapAmount.token.address,
        );

        const amountOutWithRate = swapAmount.mulDownFixed(this.tokens[this.bptIndex].rate);

        const balancesNoBpt = this.tokensNoBpt.map(t => t.scale18);
        const invariant = _calculateInvariant(this.amp, balancesNoBpt);

        const tokenInScale18 = _calcTokenInGivenExactBptOut(
            this.amp,
            [...balancesNoBpt],
            tInIndex,
            amountOutWithRate.scale18,
            this.totalShares,
            invariant,
            this.swapFee,
        );

        const amountIn = TokenAmount.fromScale18Amount(tokenIn, tokenInScale18, true);
        const amountInWithFee = this.addSwapFeeAmount(amountIn);
        const amountInWithRate = amountInWithFee.divDownFixed(this.tokensNoBpt[tInIndex].rate);

        return amountInWithRate;
    }

    private _exitSwapExactBptInForTokenOut(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
    ): TokenAmount {
        const tOutIndex = this.tokensNoBpt.findIndex(t => t.token.address === tokenOut.address);

        const amountInWithRate = swapAmount.mulDownFixed(this.tokens[this.bptIndex].rate);

        const balancesNoBpt = this.tokensNoBpt.map(t => t.scale18);
        const invariant = _calculateInvariant(this.amp, balancesNoBpt);

        const tokenOutScale18 = _calcTokenOutGivenExactBptIn(
            this.amp,
            [...balancesNoBpt],
            tOutIndex,
            amountInWithRate.scale18,
            this.totalShares,
            invariant,
            this.swapFee,
        );

        const amountOut = TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);
        const amountOutWithRate = amountOut.divDownFixed(this.tokensNoBpt[tOutIndex].rate);

        return amountOutWithRate;
    }

    private _exitSwapExactTokenOutForBptIn(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
    ): TokenAmount {
        const tOutIndex = this.tokensNoBpt.findIndex(t => t.token.address === tokenOut.address);
        const amountsOut = new Array(this.tokensNoBpt.length);

        const amountOutWithRate = swapAmount.mulDownFixed(this.tokensNoBpt[tOutIndex].rate);
        amountsOut[tOutIndex] = amountOutWithRate.scale18;

        const balancesNoBpt = this.tokensNoBpt.map(t => t.scale18);
        const invariant = _calculateInvariant(this.amp, balancesNoBpt);

        const tokenInScale18 = _calcBptInGivenExactTokensOut(
            this.amp,
            [...balancesNoBpt],
            amountsOut,
            this.totalShares,
            invariant,
            this.swapFee,
        );

        const amountIn = TokenAmount.fromScale18Amount(tokenIn, tokenInScale18, true);
        const amountInWithRate = amountIn.divDownFixed(this.tokens[this.bptIndex].rate);

        return amountInWithRate;
    }
}
