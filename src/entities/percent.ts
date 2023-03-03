import _Decimal from 'decimal.js-light';
import { formatEther, parseEther } from '@ethersproject/units';
import { HumanAmount } from '../types';

export type BigintIsh = bigint | string | number;

export class Percent {
    public value: bigint;

    public static fromHumanPercent(percent: HumanAmount) {
        const rawValue = parseEther(new _Decimal(percent).div(100).toString()).toString();
        return new Percent(rawValue);
    }

    public static fromHumanDecimal(decimal: HumanAmount) {
        const rawValue = parseEther(decimal).toString();
        return new Percent(rawValue);
    }

    public static fromRawValue(rawValue: BigintIsh) {
        return new Percent(rawValue);
    }

    protected constructor(value: BigintIsh) {
        this.value = BigInt(value);
    }

    public toPercentSignificant(significantDigits: number = 6): string {
        return new _Decimal(formatEther(this.value))
            .times(100)
            .toSignificantDigits(significantDigits)
            .toString();
    }

    public toDecimalSignificant(significantDigits: number = 6): string {
        return new _Decimal(formatEther(this.value))
            .toSignificantDigits(significantDigits)
            .toString();
    }
}
