import _Decimal from 'decimal.js-light';
import { parseUnits } from 'viem';
import { InputAmount, BigintIsh } from '@/types';
import { DECIMAL_SCALES } from '@/utils/constants';
import { MathSol, WAD } from '@/utils/math';
import { Token } from './token';
import { TokenAmount } from './tokenAmount';

export class TokenAmountWithRate extends TokenAmount {
    public rate: bigint;

    public static fromRawAmount(): TokenAmount {
        throw new Error('Use fromRawAmountWithRate instead');
    }

    public static fromRawAmountWithRate(
        token: Token,
        rawAmount: bigint,
        rate: bigint,
    ): TokenAmountWithRate {
        return new TokenAmountWithRate(token, rawAmount, rate);
    }

    public static fromHumanAmount(): TokenAmount {
        throw new Error('Use fromHumanAmountWithRate instead');
    }

    public static fromHumanAmountWithRate(
        token: Token,
        humanAmount: `${number}`,
        rate: bigint,
    ): TokenAmountWithRate {
        const rawAmount = parseUnits(humanAmount, token.decimals);
        return new TokenAmountWithRate(token, rawAmount, rate);
    }

    public static fromScale18Amount(): TokenAmount {
        throw new Error('Use fromScale18AmountWithRate instead');
    }

    public static fromScale18AmountWithRate(
        token: Token,
        scale18: bigint,
        rate: bigint,
        divUp = true,
    ): TokenAmountWithRate {
        const scalar = DECIMAL_SCALES[18 - token.decimals];
        const scaledRate = rate * scalar;
        const amount = divUp
            ? MathSol.divUpFixed(scale18, scaledRate)
            : MathSol.divDownFixed(scale18, scaledRate);
        return new TokenAmountWithRate(token, amount, rate);
    }

    public static fromInputAmount(
        input: InputAmount,
        chainId: number,
    ): TokenAmount {
        const token = new Token(chainId, input.address, input.decimals);
        return new TokenAmount(token, input.rawAmount);
    }

    protected constructor(token: Token, amount: BigintIsh, rate: bigint) {
        super(token, amount);
        this.rate = rate;
        this.scale18 = this.amount * this.scalar * this.rate;
    }

    public add(other: TokenAmount): TokenAmount {
        this.amount = this.amount + other.amount;
        this.scale18 = (this.amount * this.scalar * this.rate) / WAD;
        return this;
    }

    public sub(other: TokenAmount): TokenAmount {
        this.amount = this.amount - other.amount;
        this.scale18 = (this.amount * this.scalar * this.rate) / WAD;
        return this;
    }

    public mulUpFixed(other: bigint): TokenAmount {
        const product = this.amount * other;
        const multiplied = (product - 1n) / WAD + 1n;
        this.amount = multiplied;
        this.scale18 = (this.amount * this.scalar * this.rate) / WAD;
        return this;
    }

    public mulDownFixed(other: bigint): TokenAmount {
        const product = this.amount * other;
        const multiplied = (product - 1n) / WAD + 1n;
        this.amount = multiplied;
        this.scale18 = (this.amount * this.scalar * this.rate) / WAD;
        return this;
    }

    public divUpFixed(other: bigint): TokenAmount {
        const divided = (this.amount * WAD + other - 1n) / other;
        this.amount = divided;
        this.scale18 = (this.amount * this.scalar * this.rate) / WAD;
        return this;
    }

    public divDownFixed(other: bigint): TokenAmount {
        const divided = (this.amount * WAD) / other;
        this.amount = divided;
        this.scale18 = (this.amount * this.scalar * this.rate) / WAD;
        return this;
    }
}
