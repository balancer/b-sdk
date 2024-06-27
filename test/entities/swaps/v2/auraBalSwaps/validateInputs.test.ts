// pnpm test -- validateInputs.test.ts
import { Token, TokenAmount } from '@/entities';
import { AuraBalSwapKind } from '@/entities/swap/swaps/v2/auraBalSwaps/auraBalSwaps';
import { auraBalToken } from '@/entities/swap/swaps/v2/auraBalSwaps/constants';
import { validateInputs } from '@/entities/swap/swaps/v2/auraBalSwaps/validateInputs';

const usdc = new Token(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6);

describe('auraBalSwaps:validateInputs', () => {
    test('should throw when FromAuraBal and not auraBal input amount', async () => {
        expect(async () => {
            validateInputs(
                TokenAmount.fromHumanAmount(usdc, '1'),
                usdc,
                AuraBalSwapKind.FromAuraBal,
            );
        }).rejects.toThrowError(
            'Input Token should be auraBAL: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        );
    });
    test('should throw for non-supported input token, ToAuraBal', async () => {
        expect(async () => {
            validateInputs(
                TokenAmount.fromHumanAmount(usdc, '1'),
                usdc,
                AuraBalSwapKind.ToAuraBal,
            );
        }).rejects.toThrowError(
            'Token not supported for auraBal swap: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        );
    });
    test('should throw for non-supported input token, FromAuraBal', async () => {
        expect(async () => {
            validateInputs(
                TokenAmount.fromHumanAmount(auraBalToken, '1'),
                usdc,
                AuraBalSwapKind.FromAuraBal,
            );
        }).rejects.toThrowError(
            'Token not supported for auraBal swap: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        );
    });
});
