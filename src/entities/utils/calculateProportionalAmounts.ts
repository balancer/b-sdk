import { Hex, Address, parseUnits } from 'viem';
import { InputAmount } from '@/types';

export function calculateAddLiquidityProportionalAmounts(
    pool: {
        id: Hex;
        tokens: { address: Address; balance: string; decimals: number }[];
    },
    inputAmount: InputAmount,
) {
    const tokensWithoutBpt = pool.tokens.filter(
        (t) => !pool.id.toLowerCase().includes(t.address.toLowerCase()),
    );
    const referenceTokenIndex = tokensWithoutBpt.findIndex(
        (t) => t.address.toLowerCase() === inputAmount.address.toLowerCase(),
    );

    if (referenceTokenIndex === -1) {
        throw new Error('Token not found in pool');
    }

    const balances = tokensWithoutBpt.map((t) =>
        parseUnits(t.balance, t.decimals),
    );

    const proportionalAmounts = balances.map(
        (b) => (b * inputAmount.rawAmount) / balances[referenceTokenIndex],
    );

    return {
        tokens: tokensWithoutBpt.map((t) => t.address),
        amounts: proportionalAmounts.map((a) => a.toString()),
    };
}
