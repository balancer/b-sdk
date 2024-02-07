import { Address, parseUnits } from 'viem';
import { InputAmount } from '@/types';
import { HumanAmount } from '@/data';

export function calculateProportionalAmounts(
    pool: {
        address: Address;
        totalShares: HumanAmount;
        tokens: { address: Address; balance: HumanAmount; decimals: number }[];
    },
    inputAmount: InputAmount,
): {
    amountsIn: InputAmount[];
    bptOut: InputAmount;
} {
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

    const totalSharesBigInt = parseUnits(pool.totalShares, 18);

    const proportionalAmounts = balances.map(
        (b) => (b * inputAmount.rawAmount) / balances[referenceTokenIndex],
    );

    const bptOut =
        (totalSharesBigInt * inputAmount.rawAmount) /
        balances[referenceTokenIndex];

    return {
        bptOut: {
            address: pool.address,
            rawAmount: bptOut,
            decimals: 18,
        },
        amountsIn: tokensWithoutBpt.map(({ address, decimals }, index) => ({
            address,
            decimals,
            rawAmount: proportionalAmounts[index],
        })),
    };
}
