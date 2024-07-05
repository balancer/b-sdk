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

    /**
     * Creates a new slippage object
     *
     * @param amount amount of slippage, always positive
     */
    protected constructor(amount: BigintIsh) {
        this.amount =
            BigInt(amount) > 0n ? BigInt(amount) : -1n * BigInt(amount);
        this.decimal = Number.parseFloat(formatEther(this.amount));
        this.percentage = this.decimal * 100;
        this.bps = this.decimal * 10000;
    }

    /**
     * Applies slippage to an amount in a given direction
     *
     * @param amount amout to apply slippage to
     * @param direction +1 adds the slippage to the amount, and -1 will remove the slippage from the amount
     * @returns
     */
    public applyTo(amount: bigint, direction: 1 | -1 = 1): bigint {
        return MathSol.mulDownFixed(
            amount,
            BigInt(direction) * this.amount + WAD,
        );
    }
}
