import { parseUnits } from 'viem';
import { InputAmount, BigintIsh } from '../types';
import { DECIMAL_SCALES } from '../utils/constants';
import { WAD } from '../utils/math';
import { Token } from './token';

export class TokenAmount {
    public readonly token: Token;
    public readonly scalar: bigint;
    public readonly decimalScale: bigint;
    public amount: bigint;
    public scale18: bigint;

    public static fromRawAmount(token: Token, rawAmount: BigintIsh) {
        return new TokenAmount(token, rawAmount);
    }

    public static fromHumanAmount(token: Token, humanAmount: `${number}`) {
        const rawAmount = parseUnits(humanAmount, token.decimals);
        return new TokenAmount(token, rawAmount);
    }

    public static fromScale18Amount(
        token: Token,
        scale18Amount: BigintIsh,
        divUp?: boolean,
    ) {
        const scalar = DECIMAL_SCALES[18 - token.decimals];
        const rawAmount = divUp
            ? 1n + (BigInt(scale18Amount) - 1n) / scalar
            : BigInt(scale18Amount) / scalar;
        return new TokenAmount(token, rawAmount);
    }

    public static fromInputAmount(
        input: InputAmount,
        chainId: number,
    ): TokenAmount {
        const token = new Token(chainId, input.address, input.decimals);
        return new TokenAmount(token, input.rawAmount);
    }

    protected constructor(token: Token, amount: BigintIsh) {
        this.decimalScale = DECIMAL_SCALES[token.decimals];
        this.token = token;
        this.amount = BigInt(amount);
        this.scalar = DECIMAL_SCALES[18 - token.decimals];
        this.scale18 = this.amount * this.scalar;
    }

    public add(other: TokenAmount): TokenAmount {
        return new TokenAmount(this.token, this.amount + other.amount);
    }

    public sub(other: TokenAmount): TokenAmount {
        return new TokenAmount(this.token, this.amount - other.amount);
    }

    public mulUpFixed(other: bigint): TokenAmount {
        const product = this.amount * other;
        const multiplied = (product - 1n) / WAD + 1n;
        return new TokenAmount(this.token, multiplied);
    }

    public mulDownFixed(other: bigint): TokenAmount {
        const multiplied = (this.amount * other) / WAD;
        return new TokenAmount(this.token, multiplied);
    }

    public divUpFixed(other: bigint): TokenAmount {
        const divided = (this.amount * WAD + other - 1n) / other;
        return new TokenAmount(this.token, divided);
    }

    public divDownFixed(other: bigint): TokenAmount {
        const divided = (this.amount * WAD) / other;
        return new TokenAmount(this.token, divided);
    }

    public toSignificant(significantDigits = 6): string {
        if (this.amount === 0n) return '0';

        // Scale up for precision, then divide
        const scaleFactor = 10n ** BigInt(significantDigits);
        const scaled = (this.amount * scaleFactor) / this.decimalScale;

        if (scaled === 0n) return '0';

        const scaledStr = scaled.toString();

        // Small number: needs leading "0."
        if (scaledStr.length <= significantDigits) {
            const padded = scaledStr.padStart(significantDigits, '0');
            // Trim trailing zeros manually
            let end = padded.length;
            while (end > 0 && padded[end - 1] === '0') end--;
            if (end === 0) return '0';
            return `0.${padded.slice(0, end)}`;
        }

        // Large number: insert decimal point
        const intLen = scaledStr.length - significantDigits;
        const intPart = scaledStr.slice(0, intLen);
        const fracPart = scaledStr.slice(intLen);

        // Trim trailing zeros from fractional part
        let end = fracPart.length;
        while (end > 0 && fracPart[end - 1] === '0') end--;

        if (end === 0) return intPart;
        return `${intPart}.${fracPart.slice(0, end)}`;
    }

    public toInputAmount(): InputAmount {
        return {
            address: this.token.address,
            decimals: this.token.decimals,
            rawAmount: this.amount,
        };
    }
}
