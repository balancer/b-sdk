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

import {
    PoolStateWithUnderlyingBalances,
    PoolStateWithUnderlyings,
} from '../types';
import { vaultExtensionAbi_V3 } from '@/abi';
import { getSortedTokens } from './getSortedTokens';
import { TokenAmount } from '../tokenAmount';

export const getBoostedPoolStateWithBalancesV3 = async (
    poolState: PoolStateWithUnderlyings,
    chainId: number,
    rpcUrl: string,
): Promise<PoolStateWithUnderlyingBalances> => {
    const publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { tokenBalances, totalShares } = await getTokenBalancesAndTotalShares(
        chainId,
        poolState,
        publicClient,
    );

    const sortedTokens = [...poolState.tokens].sort(
        (a, b) => a.index - b.index,
    );

    const underlyingBalances = await getUnderlyingBalances(
        sortedTokens,
        tokenBalances,
        publicClient,
    );

    const poolStateWithUnderlyingBalances: PoolStateWithUnderlyingBalances = {
        ...poolState,
        tokens: sortedTokens.map((token, i) => ({
            ...token,
            balance: formatUnits(
                tokenBalances[i].amount,
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
    sortedTokens: import('/Users/bruninho/Development/Balancer/b-sdk/src/entities/types').PoolTokenWithUnderlying[],
    tokenBalances: TokenAmount[],
    publicClient: PublicClient,
) => {
    const getUnderlyingBalancesContracts = sortedTokens
        .filter((token) => token.underlyingToken !== null)
        .map((token, i) => ({
            address: token.address,
            abi: erc4626Abi,
            functionName: 'previewRedeem' as const,
            args: [tokenBalances[i].amount] as const,
        }));

    const underlyingBalanceOutputs = await publicClient.multicall({
        contracts: [...getUnderlyingBalancesContracts],
    });
    if (
        underlyingBalanceOutputs.some((output) => output.status === 'failure')
    ) {
        throw new Error(
            'Error: Unable to get underlying balances for v3 pool.',
        );
    }

    const underlyingBalances = underlyingBalanceOutputs.map(
        (output) => output.result as bigint,
    );
    return underlyingBalances;
};

const getTokenBalancesAndTotalShares = async (
    chainId: number,
    poolState: PoolStateWithUnderlyings,
    publicClient: PublicClient,
) => {
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

    const outputs = await publicClient.multicall({
        contracts: [totalSupplyContract, getBalanceContracts],
    });

    if (outputs.some((output) => output.status === 'failure')) {
        throw new Error(
            'Error: Unable to get pool state with balances for v3 pool.',
        );
    }

    const totalShares = outputs[0].result as bigint;
    const balancesScale18 = outputs[1].result as bigint[];

    const poolTokens = getSortedTokens(poolState.tokens, chainId);
    const tokenBalances = poolTokens.map((token, i) =>
        TokenAmount.fromScale18Amount(token, balancesScale18[i]),
    );

    return { tokenBalances, totalShares };
};
