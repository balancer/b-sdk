// pnpm test -- parseInputs.test.ts
import { AuraBalSwapKind, Token, TokenAmount } from '@/entities';
import { auraBalToken } from '@/entities/swap/swaps/v2/auraBalSwaps/constants';
import { parseInputs } from '@/entities/swap/swaps/v2/auraBalSwaps/parseInputs';
import { SwapKind } from '@/types';
import { ChainId } from '@/utils';

const usdc = new Token(
    ChainId.MAINNET,
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    6,
);
const bal = new Token(
    ChainId.MAINNET,
    '0xba100000625a3754423978a60c9317c58a424e3D',
    18,
);

describe('auraBalSwaps:parseInputs', () => {
    test('should throw when neither token is auraBal', async () => {
        expect(async () => {
            parseInputs({
                tokenIn: usdc,
                tokenOut: usdc,
                kind: SwapKind.GivenIn,
                swapAmount: TokenAmount.fromHumanAmount(usdc, '1'),
            });
        }).rejects.toThrowError(
            'auraBal Swap: Must have tokenIn or tokenOut as auraBal.',
        );
    });
    test('should throw for non-supported input token', async () => {
        expect(async () => {
            parseInputs({
                tokenIn: usdc,
                tokenOut: auraBalToken,
                kind: SwapKind.GivenIn,
                swapAmount: TokenAmount.fromHumanAmount(usdc, '1'),
            });
        }).rejects.toThrowError('auraBal Swap: Unsupported tokenIn');
    });
    test('should throw for non-supported output token', async () => {
        expect(async () => {
            parseInputs({
                tokenIn: auraBalToken,
                tokenOut: usdc,
                kind: SwapKind.GivenIn,
                swapAmount: TokenAmount.fromHumanAmount(auraBalToken, '1'),
            });
        }).rejects.toThrowError('auraBal Swap: Unsupported tokenOut');
    });
    test('should throw for ExactOut', async () => {
        expect(async () => {
            parseInputs({
                tokenIn: auraBalToken,
                tokenOut: bal,
                kind: SwapKind.GivenOut,
                swapAmount: TokenAmount.fromHumanAmount(auraBalToken, '1'),
            });
        }).rejects.toThrowError('auraBal Swap: Must be SwapKind GivenIn.');
    });
    test('should throw when tokenIn and swapAmount tokens dont match', async () => {
        expect(async () => {
            parseInputs({
                tokenIn: auraBalToken,
                tokenOut: bal,
                kind: SwapKind.GivenIn,
                swapAmount: TokenAmount.fromHumanAmount(usdc, '1'),
            });
        }).rejects.toThrowError(
            'auraBal Swap: tokenIn and swapAmount address must match.',
        );
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
