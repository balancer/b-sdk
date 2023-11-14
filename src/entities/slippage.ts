import { formatEther, parseEther } from 'viem';
import { BigintIsh } from './tokenAmount';
import { MathSol, WAD } from '../utils';

export class Slippage {
    public amount: bigint;
    public decimal: number;
    public percentage: number;
    public bps: number;

    public static fromRawAmount(rawAmount: BigintIsh) {
        return new Slippage(rawAmount);
    }

    public static fromDecimal(decimalAmount: `${number}`) {
        const rawAmount = parseEther(decimalAmount);
        return Slippage.fromRawAmount(rawAmount);
    }

    public static fromPercentage(percentageAmount: `${number}`) {
        const decimalAmount = Number(percentageAmount) / 100;
        return Slippage.fromDecimal(`${decimalAmount}`);
    }

    public static fromBasisPoints(bpsAmount: `${number}`) {
        const decimalAmount = Number(bpsAmount) / 10000;
        return Slippage.fromDecimal(`${decimalAmount}`);
    }

    protected constructor(amount: BigintIsh) {
        this.amount = BigInt(amount);
        this.decimal = parseFloat(formatEther(this.amount));
        this.percentage = this.decimal * 100;
        this.bps = this.decimal * 10000;
    }

    public applyTo(amount: bigint): bigint {
        return MathSol.mulDownFixed(amount, this.amount + WAD);
    }

    public removeFrom(amount: bigint): bigint {
        return MathSol.divDownFixed(amount, this.amount + WAD);
    }
}
