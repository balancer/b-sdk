// pnpm test -- parseInputs.test.ts
import { AuraBalSwapKind, Token, TokenAmount } from '@/entities';
import { auraBalToken } from '@/entities/swap/swaps/v2/auraBalSwaps/constants';
import { parseInputs } from '@/entities/swap/swaps/v2/auraBalSwaps/parseInputs';
import { SwapKind } from '@/types';

const usdc = new Token(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6);
const bal = new Token(1, '0xba100000625a3754423978a60c9317c58a424e3D', 18);

describe('auraBalSwaps:parseInputs', () => {
    test('should throw for non-supported input token, ToAuraBal', async () => {
        expect(async () => {
            parseInputs({
                tokenIn: usdc,
                tokenOut: auraBalToken,
                kind: SwapKind.GivenIn,
                swapAmount: TokenAmount.fromHumanAmount(usdc, '1'),
            });
        }).rejects.toThrowError('Not A Valid AuraBal Swap');
    });
    test('should throw for non-supported input token, FromAuraBal', async () => {
        expect(async () => {
            parseInputs({
                tokenIn: auraBalToken,
                tokenOut: usdc,
                kind: SwapKind.GivenIn,
                swapAmount: TokenAmount.fromHumanAmount(auraBalToken, '1'),
            });
        }).rejects.toThrowError('Not A Valid AuraBal Swap');
    });
    test('should throw for ExactOut', async () => {
        expect(async () => {
            parseInputs({
                tokenIn: auraBalToken,
                tokenOut: bal,
                kind: SwapKind.GivenOut,
                swapAmount: TokenAmount.fromHumanAmount(auraBalToken, '1'),
            });
        }).rejects.toThrowError('Not A Valid AuraBal Swap');
    });
    test('should throw when FromAuraBal and not auraBal input amount', async () => {
        expect(async () => {
            parseInputs({
                tokenIn: auraBalToken,
                tokenOut: bal,
                kind: SwapKind.GivenIn,
                swapAmount: TokenAmount.fromHumanAmount(usdc, '1'),
            });
        }).rejects.toThrowError('Not A Valid AuraBal Swap');
    });
    test('valid fromAuraBal', async () => {
        const amount = TokenAmount.fromHumanAmount(auraBalToken, '1');
        const parsedInput = parseInputs({
            tokenIn: auraBalToken,
            tokenOut: bal,
            kind: SwapKind.GivenIn,
            swapAmount: amount,
        });
        const expected = {
            kind: AuraBalSwapKind.FromAuraBal,
            swapToken: bal,
            inputAmount: amount,
        };
        expect(parsedInput).to.deep.eq(expected);
    });
    test('valid toAuraBal', async () => {
        const amount = TokenAmount.fromHumanAmount(bal, '1');
        const parsedInput = parseInputs({
            tokenIn: bal,
            tokenOut: auraBalToken,
            kind: SwapKind.GivenIn,
            swapAmount: amount,
        });
        const expected = {
            kind: AuraBalSwapKind.ToAuraBal,
            swapToken: bal,
            inputAmount: amount,
        };
        expect(parsedInput).to.deep.eq(expected);
    });
});
