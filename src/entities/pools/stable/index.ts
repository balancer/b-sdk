import { PoolType, SwapKind } from '../../../types';
import { BigintIsh, Token, TokenAmount } from '../../';
import { BasePool } from '../';
import {
    ALMOST_ONE,
    getPoolAddress,
    MathSol,
    PREMINTED_STABLE_BPT,
    unsafeFastParseEther,
    WAD,
} from '../../../utils';
import {
    _calcBptInGivenExactTokensOut,
    _calcBptOutGivenExactTokensIn,
    _calcInGivenOut,
    _calcOutGivenIn,
    _calcTokenInGivenExactBptOut,
    _calcTokenOutGivenExactBptIn,
    _calculateInvariant,
} from './math';
import { RawComposableStablePool } from '../../../data/types';

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

class BPT extends TokenAmount {
    public readonly rate: bigint;
    public readonly virtualBalance: bigint;
    public readonly index: number;

    public constructor(token: Token, amount: BigintIsh, index: number) {
        super(token, amount);
        this.rate = WAD;
        this.virtualBalance = PREMINTED_STABLE_BPT - this.amount;
        this.index = index;
    }
}

export class StablePool implements BasePool {
    public readonly id: string;
    public readonly address: string;
    public readonly poolType: PoolType = PoolType.ComposableStable;
    public readonly amp: bigint;
    public readonly swapFee: bigint;
    public readonly tokens: (StablePoolToken | BPT)[];
    public readonly tokensNoBpt: StablePoolToken[];
    public readonly totalShares: bigint;
    public readonly bptIndex: number;

    private readonly tokenMap: Map<string, StablePoolToken | BPT>;
    private readonly tokenIndexMap: Map<string, number>;
    private readonly tokenNoBptIndexMap: Map<string, number>;

    static fromRawPool(pool: RawComposableStablePool): StablePool {
        const poolTokens: (BPT | StablePoolToken)[] = [];

        for (const t of pool.tokens) {
            if (!t.priceRate) throw new Error('Stable pool token does not have a price rate');
            const token = new Token(1, t.address, t.decimals, t.symbol, t.name);
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);

            if (t.address === pool.address) {
                poolTokens.push(new BPT(token, tokenAmount.amount, t.index));
            } else {
                poolTokens.push(
                    new StablePoolToken(
                        token,
                        tokenAmount.amount,
                        unsafeFastParseEther(t.priceRate),
                        t.index,
                    ),
                );
            }
        }

        const totalShares = unsafeFastParseEther(pool.totalShares);
        const amp = BigInt(pool.amp) * 1000n;

        return new StablePool(
            pool.id,
            amp,
            unsafeFastParseEther(pool.swapFee),
            poolTokens,
            totalShares,
        );
    }

    constructor(
        id: string,
        amp: bigint,
        swapFee: bigint,
        tokens: StablePoolToken[],
        totalShares: bigint,
    ) {
        this.id = id;
        this.address = getPoolAddress(id);
        this.amp = amp;
        this.swapFee = swapFee;
        this.totalShares = totalShares;

        this.tokens = tokens.sort((a, b) => a.index - b.index);
        this.tokenMap = new Map(this.tokens.map(token => [token.token.address, token]));
        this.tokenIndexMap = new Map(this.tokens.map(token => [token.token.address, token.index]));
        this.bptIndex = this.tokenIndexMap.get(this.address) || -1;
        this.tokensNoBpt = [...this.tokens].splice(this.bptIndex, 1);
        this.tokenNoBptIndexMap = new Map(
            this.tokensNoBpt.map(token => [
                token.token.address,
                token.index > this.bptIndex ? token.index - 1 : token.index,
            ]),
        );
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

        const tInIndexNoBpt = this.tokenNoBptIndexMap.get(tokenIn.address) || -1;
        const tOutIndexNoBpt = this.tokenNoBptIndexMap.get(tokenOut.address) || -1;

        const amountInWithFee = this.subtractSwapFeeAmount(swapAmount);
        const amountInWithRate = amountInWithFee.mulDownFixed(this.tokens[tInIndex].rate);
        const balancesNoBpt = this.tokensNoBpt.map(t => t.scale18);

        const invariant = _calculateInvariant(this.amp, balancesNoBpt);

        let tokenOutScale18: bigint;
        if (tokenIn.isEqual(this.tokens[this.bptIndex].token)) {
            tokenOutScale18 = _calcTokenOutGivenExactBptIn(
                this.amp,
                [...balancesNoBpt],
                tOutIndexNoBpt,
                amountInWithRate.scale18,
                this.totalShares,
                invariant,
                this.swapFee,
            );
        } else if (tokenOut.isEqual(this.tokens[this.bptIndex].token)) {
            const amountsIn = new Array(this.tokensNoBpt.length).fill(0n);
            amountsIn[tInIndexNoBpt] = amountInWithRate.scale18;

            tokenOutScale18 = _calcBptOutGivenExactTokensIn(
                this.amp,
                [...balancesNoBpt],
                amountsIn,
                this.totalShares,
                invariant,
                this.swapFee,
            );
        } else {
            tokenOutScale18 = _calcOutGivenIn(
                this.amp,
                [...balancesNoBpt],
                tInIndexNoBpt,
                tOutIndexNoBpt,
                amountInWithRate.scale18,
                invariant,
            );
        }

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

        const tInIndexNoBpt = this.tokenNoBptIndexMap.get(tokenIn.address) || -1;
        const tOutIndexNoBpt = this.tokenNoBptIndexMap.get(tokenOut.address) || -1;

        const amountOutWithRate = swapAmount.mulDownFixed(this.tokens[tOutIndex].rate);
        const balancesNoBpt = this.tokensNoBpt.map(t => t.scale18);

        const invariant = _calculateInvariant(this.amp, balancesNoBpt);

        let tokenInScale18: bigint;
        if (tokenIn.isEqual(this.tokens[this.bptIndex].token)) {
            const amountsOut = new Array(this.tokensNoBpt.length).fill(0n);
            amountsOut[tOutIndexNoBpt] = amountOutWithRate.scale18;

            tokenInScale18 = _calcBptInGivenExactTokensOut(
                this.amp,
                [...balancesNoBpt],
                amountsOut,
                this.totalShares,
                invariant,
                this.swapFee,
            );
        } else if (tokenOut.isEqual(this.tokens[this.bptIndex].token)) {
            tokenInScale18 = _calcTokenInGivenExactBptOut(
                this.amp,
                [...balancesNoBpt],
                tInIndexNoBpt,
                amountOutWithRate.scale18,
                this.totalShares,
                invariant,
                this.swapFee,
            );
        } else {
            tokenInScale18 = _calcInGivenOut(
                this.amp,
                [...balancesNoBpt],
                tInIndexNoBpt,
                tOutIndexNoBpt,
                amountOutWithRate.scale18,
                invariant,
            );
        }

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
