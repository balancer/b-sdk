import { createPublicClient, formatEther, formatUnits, http } from 'viem';

import { HumanAmount } from '@/data';
import { Address, InputAmount } from '@/types';
import { CHAINS, VAULT_V3 } from '@/utils';

import { getSortedTokens } from './getSortedTokens';
import { PoolState, PoolStateWithBalances } from '../types';
import { AddLiquidityProportionalInput } from '../addLiquidity/types';
import { calculateProportionalAmounts } from './calculateProportionalAmounts';
import { vaultExtensionV3Abi } from '@/abi';

type MulticallContract = {
    address: Address;
    abi: any;
    functionName: string;
    args?: any;
};

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
                // TODO
                bptAmount = input.referenceAmount;
                break;
            case 2:
                // TODO
                bptAmount = input.referenceAmount;
                break;
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
