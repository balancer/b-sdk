import { formatEther, formatUnits, parseEther, parseUnits } from 'viem';
import { BigintIsh } from '@/types';
import { MathSol, WAD } from '@/utils';

export class Slippage {
    public amount: bigint;
    public decimal: number;
    public percentage: number;
    public bps: number;

    public static fromRawAmount(rawAmount: BigintIsh) {
        return new Slippage(rawAmount);
    }

    public static fromDecimal(decimalAmount: `${number}`) {
        const fixedDecimalAmount = Number(decimalAmount).toFixed(18);
        const rawAmount = parseEther(fixedDecimalAmount);
        return Slippage.fromRawAmount(rawAmount);
    }

    public static fromPercentage(percentageAmount: `${number}`) {
        const fixedPercentageAmount = Number(percentageAmount).toFixed(18 - 2);
        const rawAmount = parseUnits(fixedPercentageAmount, 18 - 2);
        return Slippage.fromRawAmount(rawAmount);
    }

    public static fromBasisPoints(bpsAmount: `${number}`) {
        const fixedBpsAmount = Number(bpsAmount).toFixed(18 - 4);
        const rawAmount = parseUnits(fixedBpsAmount, 18 - 4);
        return Slippage.fromRawAmount(rawAmount);
    }

    /**
     * Creates a new slippage object
     *
     * @param amount amount of slippage, always positive
     */
    protected constructor(amount: BigintIsh) {
        this.amount =
            BigInt(amount) > 0n ? BigInt(amount) : -1n * BigInt(amount);
        this.decimal = Number(formatEther(this.amount));
        this.percentage = Number(formatUnits(this.amount, 18 - 2));
        this.bps = Number(formatUnits(this.amount, 18 - 4));
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
