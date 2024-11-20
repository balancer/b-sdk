import { Address, parseUnits } from 'viem';
import { InputAmount } from '@/types';
import { HumanAmount } from '@/data';
import { MathSol } from '@/utils';
import { AddLiquidityProportionalInput } from '../addLiquidity/types';
import { PoolState, PoolStateWithUnderlyings } from '../types';
import { getPoolStateWithBalancesV2 } from './getPoolStateWithBalancesV2';
import {
    getBoostedPoolStateWithBalancesV3,
    getPoolStateWithBalancesV3,
} from './getPoolStateWithBalancesV3';
import { AddLiquidityBoostedProportionalInput } from '../addLiquidityBoosted/types';

/**
 * For a given pool and reference token amount, calculate all token amounts proportional to their balances within the pool.
 *
 * @param pool
 * @param referenceAmount
 * @returns Proportional amounts rounded down based on smart contract implementation for calculateProportionalAmountsOut.
 */
export function calculateProportionalAmounts(
    pool: {
        address: Address;
        totalShares: HumanAmount;
        tokens: { address: Address; balance: HumanAmount; decimals: number }[];
    },
    referenceAmount: InputAmount,
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
    const ratio = MathSol.divDownFixed(
        referenceAmount.rawAmount,
        referenceTokenBalance,
    );
    const proportionalAmounts = balances.map((b) =>
        MathSol.mulDownFixed(b, ratio),
    );

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

/**
 * Calculate the BPT amount for a given reference amount in a pool (rounded down).
 *
 * Note: this is used in the AddLiquidityProportional query scenario, where a non-bpt refenceAmount is provided and
 * the SDK needs to infer the corresponding bptOut. Rounding down favors leaving some dust behind instead of returning an amount
 * slightly higher than the referenceAmount provided, in order to prevent a revert in the add liquidity proportional transaction.
 * @param input
 * @param poolState
 * @returns
 */
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
                ));
                break;
            }
        }
    }
    return bptAmount;
};

/**
 * Calculate the BPT amount for a given reference amount in a boosted pool (rounded down).
 *
 * @param input
 * @param poolState
 * @returns
 */
export const getBptAmountFromReferenceAmountBoosted = async (
    input: AddLiquidityBoostedProportionalInput,
    poolStateWithUnderlyings: PoolStateWithUnderlyings,
): Promise<InputAmount> => {
    let bptAmount: InputAmount;
    if (input.referenceAmount.address === poolStateWithUnderlyings.address) {
        bptAmount = input.referenceAmount;
    } else {
        const poolStateWithUnderlyingBalances =
            await getBoostedPoolStateWithBalancesV3(
                poolStateWithUnderlyings,
                input.chainId,
                input.rpcUrl,
            );

        // use underlying tokens as tokens if they exist (in case of a partial boosted pool)
        const poolStateWithBalances = {
            ...poolStateWithUnderlyingBalances,
            tokens: poolStateWithUnderlyingBalances.tokens.map(
                (t) => t.underlyingToken ?? t,
            ),
        };

        ({ bptAmount } = calculateProportionalAmounts(
            poolStateWithBalances,
            input.referenceAmount,
        ));
    }
    return bptAmount;
};
