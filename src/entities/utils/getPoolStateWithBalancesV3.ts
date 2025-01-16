import {
    createPublicClient,
    erc4626Abi,
    formatEther,
    formatUnits,
    http,
    PublicClient,
} from 'viem';

import { HumanAmount } from '@/data';
import { CHAINS, VAULT_V3 } from '@/utils';

import { getSortedTokens } from './getSortedTokens';
import {
    PoolState,
    PoolStateWithBalances,
    PoolStateWithUnderlyingBalances,
    PoolStateWithUnderlyings,
    PoolTokenWithUnderlying,
} from '../types';
import { vaultExtensionAbi_V3 } from '@/abi';
import { TokenAmount } from '../tokenAmount';

export const getPoolStateWithBalancesV3 = async (
    poolState: PoolState,
    chainId: number,
    rpcUrl: string,
): Promise<PoolStateWithBalances> => {
    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    // get on-chain pool token balances and total shares
    const { tokenAmounts, totalShares } = await getTokenAmountsAndTotalShares(
        chainId,
        poolState,
        publicClient,
    );

    // build PoolStateWithBalances object with queried on-chain balances
    const poolStateWithBalances: PoolStateWithBalances = {
        ...poolState,
        tokens: tokenAmounts.map((tokenAmount, i) => ({
            address: tokenAmount.token.address,
            decimals: tokenAmount.token.decimals,
            index: i,
            balance: formatUnits(
                tokenAmount.amount,
                tokenAmount.token.decimals,
            ) as HumanAmount,
        })),
        totalShares: formatEther(totalShares) as HumanAmount,
    };
    return poolStateWithBalances;
};

export const getBoostedPoolStateWithBalancesV3 = async (
    poolState: PoolStateWithUnderlyings,
    chainId: number,
    rpcUrl: string,
): Promise<PoolStateWithUnderlyingBalances> => {
    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    // get on-chain pool token balances and total shares
    const { tokenAmounts, totalShares } = await getTokenAmountsAndTotalShares(
        chainId,
        poolState,
        publicClient,
    );

    const sortedTokens = [...poolState.tokens].sort(
        (a, b) => a.index - b.index,
    );

    // get on-chain balances for each respective underlying pool token (by querying erc4626 previewRedeem function)
    const underlyingBalances = await getUnderlyingBalances(
        sortedTokens,
        tokenAmounts,
        publicClient,
    );

    // build PoolStateWithUnderlyingBalances object with queried on-chain balances
    const poolStateWithUnderlyingBalances: PoolStateWithUnderlyingBalances = {
        ...poolState,
        tokens: sortedTokens.map((token, i) => ({
            ...token,
            balance: formatUnits(
                tokenAmounts[i].amount,
                token.decimals,
            ) as HumanAmount,
            underlyingToken:
                token.underlyingToken === null
                    ? null
                    : {
                          ...token.underlyingToken,
                          balance: formatUnits(
                              underlyingBalances.shift() as bigint,
                              token.underlyingToken.decimals,
                          ) as HumanAmount,
                      },
        })),
        totalShares: formatEther(totalShares) as HumanAmount,
    };
    return poolStateWithUnderlyingBalances;
};

const getUnderlyingBalances = async (
    sortedTokens: PoolTokenWithUnderlying[],
    tokenAmounts: TokenAmount[],
    publicClient: PublicClient,
) => {
    const underlyingTokens = sortedTokens
        .map((token, index) => ({ token, index }))
        .filter(({ token }) => token.underlyingToken !== null);

    const getUnderlyingBalancesContracts = underlyingTokens.map(
        ({ token, index }) => ({
            address: token.address,
            abi: erc4626Abi,
            functionName: 'previewRedeem' as const,
            args: [tokenAmounts[index].amount] as const,
        }),
    );

    // execute multicall to get on-chain balances for each underlying token
    const underlyingBalanceOutputs = await publicClient.multicall({
        contracts: [...getUnderlyingBalancesContracts],
    });

    if (
        underlyingBalanceOutputs.some((output) => output.status === 'failure')
    ) {
        // throw error if any of the underlying balance calls failed
        throw new Error(
            'Error: Unable to get underlying balances for v3 pool.',
        );
    }

    // extract underlying balances from multicall outputs
    const underlyingBalances = underlyingBalanceOutputs.map(
        (output) => output.result as bigint,
    );

    return underlyingBalances;
};

const getTokenAmountsAndTotalShares = async (
    chainId: number,
    poolState: PoolState,
    publicClient: PublicClient,
) => {
    // create contract calls to get total supply and balances for each pool token
    const totalSupplyContract = {
        address: VAULT_V3[chainId],
        abi: vaultExtensionAbi_V3,
        functionName: 'totalSupply' as const,
        args: [poolState.address] as const,
    };
    const getBalanceContracts = {
        address: VAULT_V3[chainId],
        abi: vaultExtensionAbi_V3,
        functionName: 'getCurrentLiveBalances' as const,
        args: [poolState.address] as const,
    };

    // execute multicall to get total supply and balances for each pool token
    const outputs = await publicClient.multicall({
        contracts: [totalSupplyContract, getBalanceContracts],
    });

    // throw error if any of the calls failed
    if (outputs.some((output) => output.status === 'failure')) {
        throw new Error(
            'Error: Unable to get pool state with balances for v3 pool.',
        );
    }

    // extract total supply and balances from multicall outputs
    const totalShares = outputs[0].result as bigint;
    const balancesScale18 = outputs[1].result as bigint[];
    const poolTokens = getSortedTokens(poolState.tokens, chainId);
    const tokenAmounts = poolTokens.map((token, i) =>
        TokenAmount.fromScale18Amount(token, balancesScale18[i]),
    );

    return { tokenAmounts, totalShares };
};
