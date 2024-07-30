import { Address, parseUnits } from 'viem';
import { InputAmount } from '@/types';
import { HumanAmount } from '@/data';
import { MathSol } from '@/utils';

/**
 * For a given pool, calculate all token amounts proportional to a given reference amount.
 * @param pool
 * @param referenceAmount
 * @returns
 */
export function calculateProportionalAmounts(
    pool: {
        address: Address;
        totalShares: HumanAmount;
        tokens: { address: Address; balance: HumanAmount; decimals: number }[];
    },
    referenceAmount: InputAmount,
    roundDown = true,
): {
    tokenAmounts: InputAmount[];
    bptAmount: InputAmount;
} {
    // ensure that bpt is taken into account even with pools that do not contain its BPT as a token
    const tokensWithoutBpt = pool.tokens.filter(
        (t) => !pool.address.toLowerCase().includes(t.address.toLowerCase()),
    );
    const tokensWithBpt = [
        ...tokensWithoutBpt,
        {
            address: pool.address,
            balance: pool.totalShares,
            decimals: 18,
        },
    ];

    // validate that input amount is relative to a token in the pool or its BPT
    const referenceTokenIndex = tokensWithBpt.findIndex(
        (t) =>
            t.address.toLowerCase() === referenceAmount.address.toLowerCase(),
    );
    if (referenceTokenIndex === -1) {
        throw new Error(
            'Reference amount must be relative to a token in the pool or its BPT',
        );
    }

    // scale up balances from HumanAmount to RawAmount
    const balances = tokensWithBpt.map((t) =>
        parseUnits(t.balance, t.decimals),
    );

    // calculate proportional amounts
    const referenceTokenBalance = balances[referenceTokenIndex];
    let proportionalAmounts: bigint[];
    if (roundDown) {
        proportionalAmounts = balances.map((b) =>
            MathSol.divDownFixed(
                MathSol.mulDownFixed(b, referenceAmount.rawAmount),
                referenceTokenBalance,
            ),
        );
    } else {
        proportionalAmounts = balances.map(
            (b) => (b * referenceAmount.rawAmount) / referenceTokenBalance,
        );
    }

    const amounts = tokensWithBpt.map(({ address, decimals }, index) => ({
        address,
        decimals,
        rawAmount: proportionalAmounts[index],
    }));

    const bptAmount = amounts.pop() as InputAmount;

    return {
        tokenAmounts: amounts,
        bptAmount,
    };
}
