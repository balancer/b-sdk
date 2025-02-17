import { ChainId, NATIVE_ASSETS, TokenAmount } from '@balancer/sdk';
import { parseUnits } from 'viem';
import _Decimal from 'decimal.js-light';

const weth = NATIVE_ASSETS[ChainId.MAINNET];

it('fromRawAmount', () => {
    const rawAmount = parseUnits('1.23456789123456789', weth.decimals);
    const tokenAmount = TokenAmount.fromRawAmount(weth, rawAmount);

    expect(tokenAmount.amount).toEqual(rawAmount);
    expect(tokenAmount.scalar).toEqual(1n);
    expect(tokenAmount.token).toEqual(weth);
});

it('toInputAmount', () => {
    const rawAmount = parseUnits('3.123456789123456789', weth.decimals);
    const tokenAmount = TokenAmount.fromRawAmount(weth, rawAmount);
    const inputAmount = tokenAmount.toInputAmount();

    expect(inputAmount.address).toBe(weth.address);
    expect(inputAmount.decimals).toBe(weth.decimals);
    expect(inputAmount.rawAmount).toBe(rawAmount);
});

describe('toSignificant', () => {
    it('should format amounts ', () => {
        const rawAmount = parseUnits('2.123456789123456789', weth.decimals);
        const tokenAmount = TokenAmount.fromRawAmount(weth, rawAmount);

        expect(tokenAmount.toSignificant(weth.decimals)).toEqual(
            '2.123456789123456789',
        );
    });

    it('should format small amounts', () => {
        const smallRawAmount = parseUnits(
            '0.000000312457062375',
            weth.decimals,
        );
        const smallTokenAmount = TokenAmount.fromRawAmount(
            weth,
            smallRawAmount,
        );

        expect(smallTokenAmount.toSignificant(weth.decimals)).toEqual(
            '0.000000312457062375',
        );
    });
});
