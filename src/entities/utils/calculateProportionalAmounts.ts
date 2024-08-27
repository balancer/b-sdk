import {
    Address,
    createPublicClient,
    formatEther,
    formatUnits,
    http,
    parseUnits,
} from 'viem';
import { InputAmount, PoolType } from '@/types';
import { HumanAmount } from '@/data';
import { CHAINS, MathSol, VAULT, VAULT_V3 } from '@/utils';
import { PoolState, PoolStateWithBalances } from '../types';
import { getSortedTokens } from './getSortedTokens';
import { vaultExtensionV3Abi, vaultV2Abi } from '@/abi';

type MulticallContract = {
    address: Address;
    abi: any;
    functionName: string;
    args?: any;
};

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

export const getPoolStateWithBalancesV2 = async (
    poolState: PoolState,
    chainId: number,
    rpcUrl: string,
): Promise<PoolStateWithBalances> => {
    const totalSupplyContract = getTotalSupplyContractV2(poolState);
    const getBalanceContracts = {
        address: VAULT[chainId],
        abi: vaultV2Abi,
        functionName: 'getPoolTokens',
        args: [poolState.id],
    };

    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const outputs = await publicClient.multicall({
        contracts: [
            totalSupplyContract,
            getBalanceContracts,
        ] as MulticallContract[],
    });

    if (outputs.some((output) => output.status === 'failure')) {
        throw new Error(
            'Error: Unable to get pool state with balances for CowAmm pool.',
        );
    }

    const totalShares = outputs[0].result as bigint;
    const [_, balances] = outputs[1].result as [Address[], bigint[], bigint];

    const sortedTokens = getSortedTokens(poolState.tokens, chainId);

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

export const getPoolStateWithBalancesV3 = async (
    poolState: PoolState,
    chainId: number,
    rpcUrl: string,
): Promise<PoolStateWithBalances> => {
    const totalSupplyContract = {
        address: VAULT_V3[chainId],
        abi: vaultExtensionV3Abi,
        functionName: 'totalSupply',
        args: [poolState.address],
    };
    const getBalanceContracts = {
        address: VAULT_V3[chainId],
        abi: vaultExtensionV3Abi,
        functionName: 'getCurrentLiveBalances',
        args: [poolState.address],
    };

    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });
    const outputs = await publicClient.multicall({
        contracts: [
            totalSupplyContract,
            getBalanceContracts,
        ] as MulticallContract[],
    });

    if (outputs.some((output) => output.status === 'failure')) {
        throw new Error(
            'Error: Unable to get pool state with balances for CowAmm pool.',
        );
    }

    const totalShares = outputs[0].result as bigint;
    const balances = outputs[1].result as bigint[];

    const sortedTokens = getSortedTokens(poolState.tokens, chainId);

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

// Private

const getTotalSupplyContractV2 = (poolState: PoolState) => {
    if (poolState.type === PoolType.ComposableStable) {
        return {
            address: poolState.address,
            abi: [
                {
                    inputs: [],
                    name: 'getActualSupply',
                    outputs: [
                        {
                            internalType: 'uint256',
                            name: '',
                            type: 'uint256',
                        },
                    ],
                    stateMutability: 'view',
                    type: 'function',
                },
            ],
            functionName: 'getActualSupply',
        };
    }

    return {
        address: poolState.address,
        abi: [
            {
                inputs: [],
                name: 'totalSupply',
                outputs: [
                    {
                        internalType: 'uint256',
                        name: '',
                        type: 'uint256',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
        ],
        functionName: 'totalSupply',
    };
};
