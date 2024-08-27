import { Address, parseUnits } from 'viem';
import { InputAmount } from '@/types';
import { HumanAmount } from '@/data';
import { MathSol } from '@/utils';
import { AddLiquidityProportionalInput } from '../addLiquidity/types';
import { PoolState } from '../types';
import { getPoolStateWithBalancesV2 } from './getPoolStateWithBalancesV2';
import { getPoolStateWithBalancesV3 } from './getPoolStateWithBalancesV3';

/**
 * For a given pool and reference token amount, calculate all token amounts proportional to their balances within the pool.
 *
 * Since proportional amounts math have inherent rounding errors, user must specify the rounding direction, which should ideally match smart contract implementation.
 *
 * Note: when using this helper to build an AddLiquidityProportional input,
 * please mind that referenceAmount should be relative to the token that the user
 * has the lowest balance compared to the pool's proportions. Otherwise the transaction
 * may require more balance than the user has.
 * @param pool
 * @param referenceAmount
 * @param roundingDirection -1: down, 0: nearest, 1: up
 * @returns Proportional amounts
 */
export function calculateProportionalAmounts(
    pool: {
        address: Address;
        totalShares: HumanAmount;
        tokens: { address: Address; balance: HumanAmount; decimals: number }[];
    },
    referenceAmount: InputAmount,
    roundingDirection: -1 | 0 | 1 = 0,
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

    switch (roundingDirection) {
        case -1: {
            const ratio = MathSol.divDownFixed(
                referenceAmount.rawAmount,
                referenceTokenBalance,
            );
            proportionalAmounts = balances.map((b) =>
                MathSol.mulDownFixed(b, ratio),
            );
            break;
        }
        case 0: {
            proportionalAmounts = balances.map(
                (b) => (b * referenceAmount.rawAmount) / referenceTokenBalance,
            );
            break;
        }
        case 1: {
            const ratio = MathSol.divUpFixed(
                referenceAmount.rawAmount,
                referenceTokenBalance,
            );
            proportionalAmounts = balances.map((b) =>
                MathSol.mulUpFixed(b, ratio),
            );
            break;
        }
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

export const getBptAmountFromReferenceAmount = async (
    input: AddLiquidityProportionalInput,
    poolState: PoolState,
): Promise<InputAmount> => {
    let bptAmount: InputAmount;
    if (input.referenceAmount.address === poolState.address) {
        bptAmount = input.referenceAmount;
    } else {
        switch (poolState.protocolVersion) {
            case 1:
                throw new Error('CowAmm pools should use CowAmm helpers');
            case 2: {
                const poolStateWithBalances = await getPoolStateWithBalancesV2(
                    poolState,
                    input.chainId,
                    input.rpcUrl,
                );
                ({ bptAmount } = calculateProportionalAmounts(
                    poolStateWithBalances,
                    input.referenceAmount,
                    -1,
                ));
                break;
            }
            case 3: {
                const poolStateWithBalances = await getPoolStateWithBalancesV3(
                    poolState,
                    input.chainId,
                    input.rpcUrl,
                );
                ({ bptAmount } = calculateProportionalAmounts(
                    poolStateWithBalances,
                    input.referenceAmount,
                    -1,
                ));
                break;
            }
        }
    }
    return bptAmount;
};
