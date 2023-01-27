import { PoolType } from '@/types';
import { Token, TokenAmount, BigintIsh } from '@/entities/';
import { BasePool } from '@/entities/pools';
import { MathSol, WAD, getPoolAddress, unsafeFastParseEther } from '@/utils';
import { _calculateInvariant, _calcOutGivenIn, _calcInGivenOut } from './math';
import { RawComposableStablePool } from '@/data/types';

export class StablePoolToken extends TokenAmount {
    public readonly rate: bigint;
    public readonly scale18: bigint;

    public constructor(token: Token, amount: BigintIsh, rate: BigintIsh) {
        super(token, amount);
        this.rate = BigInt(rate);
        this.scale18 = (this.amount * this.scalar * this.rate) / WAD;
    }
}
export class StablePool implements BasePool {
    id: string;
    address: string;
    poolType: PoolType = PoolType.ComposableStable;
    amp: bigint;
    swapFee: bigint;
    tokens: StablePoolToken[];
    bptIndex: number;

    static fromRawPool(pool: RawComposableStablePool): StablePool {
        const orderedTokens = pool.tokens.sort((a, b) => a.index - b.index);
        const poolTokens = orderedTokens.map(t => {
            if (!t.priceRate) throw new Error('Stable pool token does not have a price rate');
            const token = new Token(1, t.address, t.decimals, t.symbol, t.name);
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);
            return new StablePoolToken(
                token,
                tokenAmount.amount,
                unsafeFastParseEther(t.priceRate),
            );
        });
        const amp = BigInt(pool.amp) * 1000n;
        const stablePool = new StablePool(
            pool.id,
            amp,
            BigInt(unsafeFastParseEther(pool.swapFee)),
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
        this.bptIndex = tokens.findIndex(t => t.token.address === this.address);
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
        // TODO: Fix stable normalized liquidity calc
        return tOut.amount * this.amp;
    }

    public swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        if (
            tokenIn === this.tokens[this.bptIndex].token ||
            tokenOut === this.tokens[this.bptIndex].token
        ) {
            throw new Error('BPT swap not implemented yet');
            // swapWithBpt()
        } else {
            const tokensNoBpt = [...this.tokens];
            tokensNoBpt.splice(this.bptIndex, 1);
            const tInIndex = tokensNoBpt.findIndex(t => t.token.address === tokenIn.address);
            const tOutIndex = tokensNoBpt.findIndex(t => t.token.address === tokenOut.address);

            if (tInIndex < 0 || tOutIndex < 0)
                throw new Error('Pool does not contain the tokens provided');

            if (swapAmount.amount > this.tokens[tInIndex].amount)
                throw new Error('Swap amount exceeds the pool limit');

            const amountWithFee = this.subtractSwapFeeAmount(swapAmount);
            const amountWithRate = amountWithFee.mulFixed(this.tokens[tInIndex].rate);
            const balancesNoBpt = tokensNoBpt.map(t => t.scale18);

            const invariant = _calculateInvariant(this.amp, balancesNoBpt);

            const tokenOutScale18 = _calcOutGivenIn(
                this.amp,
                balancesNoBpt,
                tInIndex,
                tOutIndex,
                amountWithRate.scale18,
                invariant,
            );

            return TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);
        }
    }

    public swapGivenOut(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        if (
            tokenIn === this.tokens[this.bptIndex].token ||
            tokenOut === this.tokens[this.bptIndex].token
        ) {
            throw new Error('BPT swap not implemented yet');
            // swapWithBpt()
        } else {
            const tokensNoBpt = [...this.tokens];
            tokensNoBpt.splice(this.bptIndex, 1);
            const tInIndex = tokensNoBpt.findIndex(t => t.token.address === tokenIn.address);
            const tOutIndex = tokensNoBpt.findIndex(t => t.token.address === tokenOut.address);

            if (tInIndex < 0 || tOutIndex < 0)
                throw new Error('Pool does not contain the tokens provided');

            if (swapAmount.amount > this.tokens[tOutIndex].amount)
                throw new Error('Swap amount exceeds the pool limit');

            const amountWithRate = swapAmount.mulFixed(this.tokens[tInIndex].rate);
            const balancesNoBpt = tokensNoBpt.map(t => t.scale18);

            const invariant = _calculateInvariant(this.amp, balancesNoBpt);

            const tokenInScale18 = _calcInGivenOut(
                this.amp,
                balancesNoBpt,
                tInIndex,
                tOutIndex,
                amountWithRate.scale18,
                invariant,
            );

            const tokenInAmount = TokenAmount.fromScale18Amount(tokenIn, tokenInScale18);
            const amountWithFee = this.addSwapFeeAmount(tokenInAmount);

            return amountWithFee;
        }
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulFixed(this.swapFee);
        return amount.sub(feeAmount);
    }

    public addSwapFeeAmount(amount: TokenAmount): TokenAmount {
        return amount.divUpFixed(MathSol.complementFixed(this.swapFee));
    }
}
