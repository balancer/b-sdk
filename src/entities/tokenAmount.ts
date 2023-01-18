import { Token } from './token';
import { parseUnits } from '@ethersproject/units';
import _Decimal from 'decimal.js-light';
import { BONE } from '../utils';

export type BigintIsh = bigint | string | number;

export class TokenAmount {
    public readonly token: Token;
    public readonly amount: bigint;
    public readonly scalar: bigint;
    public readonly decimalScale: bigint;
    public readonly scale18: bigint;

    public static fromRawAmount(token: Token, rawAmount: BigintIsh) {
        return new TokenAmount(token, rawAmount);
    }

    public static fromHumanAmount(token: Token, humanAmount: string) {
        const rawAmount = parseUnits(humanAmount, token.decimals).toString();
        return new TokenAmount(token, rawAmount);
    }

    public static fromScale18Amount(token: Token, scale18Amount: BigintIsh) {
        const scalar = BigInt(10) ** BigInt(18 - token.decimals);
        const rawAmount = BigInt(scale18Amount) / scalar;
        return new TokenAmount(token, rawAmount);
    }

    protected constructor(token: Token, amount: BigintIsh) {
        this.decimalScale = BigInt(10) ** BigInt(token.decimals);
        this.token = token;
        this.amount = BigInt(amount);
        this.scalar = BigInt(10) ** BigInt(18 - token.decimals);
        this.scale18 = this.amount * this.scalar;
    }

    public add(other: TokenAmount): TokenAmount {
        return new TokenAmount(this.token, this.amount + other.amount);
    }

    public sub(other: TokenAmount): TokenAmount {
        return new TokenAmount(this.token, this.amount - other.amount);
    }

    // TODO Decide what to do for standard mul vs token mul
    public mulFixed(other: bigint): TokenAmount {
        const multiplied = (this.amount * other) / BONE;
        return new TokenAmount(this.token, multiplied);
    }
    // TODO Decide what to do for standard div vs token div
    public divide(other: bigint): TokenAmount {
        const divided = (this.amount * this.decimalScale) / other;
        return new TokenAmount(this.token, divided);
    }

    public toSignificant(significantDigits: number = 6): string {
        return new _Decimal(this.amount.toString())
            .div(new _Decimal(this.decimalScale.toString()).toDecimalPlaces(significantDigits))
            .toString();
    }
}
