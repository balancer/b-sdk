import { Address, parseUnits } from 'viem';
import { InputAmount } from '@/types';

export function calculateProportionalAmounts(
    pool: {
        address: Address;
        tokens: { address: Address; balance: string; decimals: number }[];
    },
    inputAmount: InputAmount,
): InputAmount[] {
    const tokensWithoutBpt = pool.tokens.filter(
        (t) => !pool.address.toLowerCase().includes(t.address.toLowerCase()),
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

    return tokensWithoutBpt.map(({ address, decimals }, index) => ({
        address,
        decimals,
        rawAmount: proportionalAmounts[index],
    }));
}
