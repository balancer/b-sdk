// pnpm test slippage.test.ts

import { describe, it, expect } from 'vitest';
import { Slippage } from '@/entities/slippage';
import { parseEther } from 'viem';

describe('Slippage', () => {
    describe('fromRawAmount', () => {
        it('should create slippage from raw amount', () => {
            const rawAmount = parseEther('0.01'); // 1% slippage
            const slippage = Slippage.fromRawAmount(rawAmount);

            expect(slippage.amount).toBe(rawAmount);
            expect(slippage.decimal).toBe(0.01);
            expect(slippage.percentage).toBe(1);
            expect(slippage.bps).toBe(100);
        });

        it('should handle negative raw amounts by making them positive', () => {
            const rawAmount = parseEther('-0.01');
            const slippage = Slippage.fromRawAmount(rawAmount);

            expect(slippage.amount).toBe(parseEther('0.01'));
            expect(slippage.decimal).toBe(0.01);
            expect(slippage.percentage).toBe(1);
            expect(slippage.bps).toBe(100);
        });

        it('should handle zero raw amount', () => {
            const slippage = Slippage.fromRawAmount(0n);

            expect(slippage.amount).toBe(0n);
            expect(slippage.decimal).toBe(0);
            expect(slippage.percentage).toBe(0);
            expect(slippage.bps).toBe(0);
        });
    });

    describe('fromDecimal', () => {
        it('should create slippage from decimal string', () => {
            const slippage = Slippage.fromDecimal('0.01');

            expect(slippage.decimal).toBe(0.01);
            expect(slippage.percentage).toBe(1);
            expect(slippage.bps).toBe(100);
        });

        it('should handle very small decimal values', () => {
            const slippage = Slippage.fromDecimal('0.0001');

            expect(slippage.decimal).toBe(0.0001);
            expect(slippage.percentage).toBe(0.01);
            expect(slippage.bps).toBe(1);
        });

        it('should handle scientific notation in decimal strings', () => {
            // This is the key test for the reported issue
            const scientificNotation = '1e-6'; // 0.000001
            const slippage = Slippage.fromDecimal(scientificNotation);

            expect(slippage.decimal).toBe(0.000001);
            expect(slippage.percentage).toBe(0.0001);
            expect(slippage.bps).toBe(0.01);
        });

        it('should handle very small scientific notation', () => {
            const verySmall = '1e-18'; // 0.000000000000000001
            const slippage = Slippage.fromDecimal(verySmall);

            expect(slippage.decimal).toBe(0.000000000000000001);
            expect(slippage.percentage).toBe(0.0000000000000001);
            expect(slippage.bps).toBe(0.00000000000001);
        });

        it('should handle large scientific notation', () => {
            const large = '1e-2'; // 0.01
            const slippage = Slippage.fromDecimal(large);

            expect(slippage.decimal).toBe(0.01);
            expect(slippage.percentage).toBe(1);
            expect(slippage.bps).toBe(100);
        });

        it('should handle negative decimal strings', () => {
            const slippage = Slippage.fromDecimal('-0.01');

            expect(slippage.decimal).toBe(0.01); // Should be made positive
            expect(slippage.percentage).toBe(1);
            expect(slippage.bps).toBe(100);
        });
    });

    describe('fromPercentage', () => {
        it('should create slippage from percentage string', () => {
            const slippage = Slippage.fromPercentage('1');

            expect(slippage.decimal).toBe(0.01);
            expect(slippage.percentage).toBe(1);
            expect(slippage.bps).toBe(100);
        });

        it('should handle decimal percentages', () => {
            const slippage = Slippage.fromPercentage('0.5');

            expect(slippage.decimal).toBe(0.005);
            expect(slippage.percentage).toBe(0.5);
            expect(slippage.bps).toBe(50);
        });

        it('should handle very small percentages', () => {
            const slippage = Slippage.fromPercentage('0.01');

            expect(slippage.decimal).toBe(0.0001);
            expect(slippage.percentage).toBe(0.01);
            expect(slippage.bps).toBe(1);
        });

        it('should handle scientific notation in percentages', () => {
            const slippage = Slippage.fromPercentage('1e-2'); // 0.01%

            expect(slippage.decimal).toBe(0.0001);
            expect(slippage.percentage).toBe(0.01);
            expect(slippage.bps).toBe(1);
        });
    });

    describe('fromBasisPoints', () => {
        it('should create slippage from basis points string', () => {
            const slippage = Slippage.fromBasisPoints('100');

            expect(slippage.decimal).toBe(0.01);
            expect(slippage.percentage).toBe(1);
            expect(slippage.bps).toBe(100);
        });

        it('should handle decimal basis points', () => {
            const slippage = Slippage.fromBasisPoints('50');

            expect(slippage.decimal).toBe(0.005);
            expect(slippage.percentage).toBe(0.5);
            expect(slippage.bps).toBe(50);
        });

        it('should handle very small basis points', () => {
            const slippage = Slippage.fromBasisPoints('1');

            expect(slippage.decimal).toBe(0.0001);
            expect(slippage.percentage).toBe(0.01);
            expect(slippage.bps).toBe(1);
        });

        it('should handle scientific notation in basis points', () => {
            const slippage = Slippage.fromBasisPoints('1e2'); // 100 bps

            expect(slippage.decimal).toBe(0.01);
            expect(slippage.percentage).toBe(1);
            expect(slippage.bps).toBe(100);
        });
    });

    describe('applyTo', () => {
        it('should apply slippage in positive direction', () => {
            const slippage = Slippage.fromPercentage('1'); // 1%
            const amount = parseEther('100');
            const result = slippage.applyTo(amount, 1);

            // Should increase the amount by 1%
            expect(result).toBeGreaterThan(amount);
        });

        it('should apply slippage in negative direction', () => {
            const slippage = Slippage.fromPercentage('1'); // 1%
            const amount = parseEther('100');
            const result = slippage.applyTo(amount, -1);

            // Should decrease the amount by 1%
            expect(result).toBeLessThan(amount);
        });

        it('should handle zero slippage', () => {
            const slippage = Slippage.fromPercentage('0');
            const amount = parseEther('100');
            const result = slippage.applyTo(amount, 1);

            expect(result).toBe(amount);
        });

        it('should handle very small slippage', () => {
            const slippage = Slippage.fromDecimal('1e-6'); // 0.0001%
            const amount = parseEther('100');
            const result = slippage.applyTo(amount, 1);

            // Should have a very small increase
            expect(result).toBeGreaterThan(amount);
            expect(result - amount).toBeLessThan(parseEther('0.001'));
        });

        it('should handle large slippage', () => {
            const slippage = Slippage.fromPercentage('50'); // 50%
            const amount = parseEther('100');
            const result = slippage.applyTo(amount, 1);

            // Should increase by 50%
            expect(result).toBeGreaterThan(amount);
        });
    });

    describe('Edge cases and scientific notation issues', () => {
        it('should handle very small numbers that might be converted to scientific notation', () => {
            // Test the specific issue mentioned in the report
            const verySmallDecimal = '0.000000000000000001';
            const slippage = Slippage.fromDecimal(verySmallDecimal);

            expect(slippage.decimal).toBe(0.000000000000000001);
            expect(slippage.percentage).toBe(0.0000000000000001);
            expect(slippage.bps).toBe(0.00000000000001);
        });

        it('should handle numbers that JavaScript converts to scientific notation', () => {
            // Test when Number() conversion might cause issues
            const smallNumber = 0.000000000000000001;
            const slippage = Slippage.fromDecimal(
                smallNumber.toString() as `${number}`,
            );

            expect(slippage.decimal).toBe(0.000000000000000001);
        });
    });

    describe('Precision and rounding', () => {
        it('should maintain consistent precision across different creation methods', () => {
            const decimal = Slippage.fromDecimal('0.01');
            const percentage = Slippage.fromPercentage('1');
            const bps = Slippage.fromBasisPoints('100');

            expect(decimal.decimal).toBe(percentage.decimal);
            expect(decimal.decimal).toBe(bps.decimal);
            expect(decimal.percentage).toBe(percentage.percentage);
            expect(decimal.percentage).toBe(bps.percentage);
            expect(decimal.bps).toBe(percentage.bps);
            expect(decimal.bps).toBe(bps.bps);
        });
    });
});
