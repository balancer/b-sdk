import { cowAmmPoolAbi } from '@/abi/cowAmmPool';
import { HumanAmount } from '@/data';
import { Address, InputAmount } from '@/types';
import { CHAINS, WAD } from '@/utils';
import {
    createPublicClient,
    formatEther,
    formatUnits,
    http,
    parseUnits,
} from 'viem';

import { PoolState, PoolStateWithBalances } from '../types';
import { getSortedTokens } from './getSortedTokens';

type MulticallContract = {
    address: Address;
    abi: any;
    functionName: string;
    args?: any;
};

export const getPoolStateWithBalancesCowAmm = async (
    poolState: PoolState,
    chainId: number,
    rpcUrl: string,
): Promise<PoolStateWithBalances> => {
    const totalSupplyContract = {
        address: poolState.address,
        abi: cowAmmPoolAbi,
        functionName: 'totalSupply',
    };
    const sortedTokens = getSortedTokens(poolState.tokens, chainId);
    const getBalanceContracts = sortedTokens.map((token) => ({
        address: poolState.address,
        abi: cowAmmPoolAbi,
        functionName: 'getBalance',
        args: [token.address],
    }));

    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const outputs = await publicClient.multicall({
        contracts: [
            totalSupplyContract,
            ...getBalanceContracts,
        ] as MulticallContract[],
    });

    if (outputs.some((output) => output.status === 'failure')) {
        throw new Error(
            'Error: Unable to get pool state with balances for CowAmm pool.',
        );
    }

    const totalShares = outputs[0].result as bigint;
    const balances = outputs.slice(1).map((output) => output.result as bigint);

    const poolStateWithBalances: PoolStateWithBalances = {
        ...poolState,
        tokens: sortedTokens.map((token, i) => ({
            address: token.address,
            decimals: token.decimals,
            index: i,
            balance: formatUnits(balances[i], token.decimals) as HumanAmount,
        })),
        totalShares: formatEther(totalShares) as HumanAmount,
    };
    return poolStateWithBalances;
};

/**
 * For a given pool and reference token amount, calculate all token amounts proportional to their balances within the pool.
 *
 * Note: when using this helper to build an AddLiquidityProportional input,
 * please mind that referenceAmount should be relative to the token that the user
 * has the lowest balance compared to the pool's proportions. Otherwise the transaction
 * may require more balance than the user has.
 * @param pool
 * @param referenceAmount
 * @returns Proportional amounts
 */
export function calculateProportionalAmountsCowAmm(
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
    const tokensWithBpt = [
        ...pool.tokens,
        {
            address: pool.address,
            balance: pool.totalShares,
            decimals: 18,
        },
    ];
    const bptIndex = tokensWithBpt.length - 1;

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

    let ratio: bigint;
    let proportionalAmounts: bigint[];
    if (referenceTokenIndex === bptIndex) {
        ratio = bdiv(referenceAmount.rawAmount, referenceTokenBalance);
        proportionalAmounts = balances.map((b) => bmul(b, ratio));
    } else {
        ratio = bdivDown(referenceAmount.rawAmount, referenceTokenBalance);
        proportionalAmounts = balances.map((b) => bmulDown(b, ratio));
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

// from cow-amm solidity implementation [bmul](https://github.com/balancer/cow-amm/blob/04c915d1ef6150b5334f4b69c7af7ddd59e050e2/src/contracts/BNum.sol#L91)
function bmul(a: bigint, b: bigint): bigint {
    const c0 = a * b;
    if (a !== BigInt(0) && c0 / a !== b) {
        throw new Error('BNum_MulOverflow');
    }

    // NOTE: using >> 1 instead of / 2
    const c1 = c0 + (WAD >> 1n);
    if (c1 < c0) {
        throw new Error('BNum_MulOverflow');
    }

    const c2 = c1 / WAD;
    return c2;
}

function bmulDown(a: bigint, b: bigint): bigint {
    const c0 = a * b;
    const c1 = c0 - (b >> 1n);
    const c2 = c1 / WAD;
    return c2;
}

// from cow-amm solidity implementation [bdiv](https://github.com/balancer/cow-amm/blob/04c915d1ef6150b5334f4b69c7af7ddd59e050e2/src/contracts/BNum.sol#L107)
function bdiv(a: bigint, b: bigint): bigint {
    if (b === 0n) {
        throw new Error('BNum_DivZero');
    }

    const c0 = a * WAD;
    if (a !== 0n && c0 / a !== WAD) {
        throw new Error('BNum_DivInternal'); // bmul overflow
    }

    // NOTE: using >> 1 instead of / 2
    const c1 = c0 + (b >> 1n);
    if (c1 < c0) {
        throw new Error('BNum_DivInternal'); // badd require
    }

    const c2 = c1 / b;
    return c2;
}

function bdivDown(a: bigint, b: bigint): bigint {
    if (b === 0n) {
        throw new Error('BNum_DivZero');
    }

    const c0 = a * WAD;
    const c1 = c0 - (WAD >> 1n);
    return c1 / b;
}
