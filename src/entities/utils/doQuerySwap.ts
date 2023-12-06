import { createPublicClient, getContract, http } from 'viem';
import { BALANCER_QUERIES, ChainId, DEFAULT_FUND_MANAGMENT } from '../../utils';
import { SingleSwap } from '../../types';
import { balancerQueriesAbi } from '../../abi';

export type SingleSwapInput = SingleSwap & {
    rpcUrl: string;
    chainId: ChainId;
};

export const doQuerySwap = async ({
    poolId,
    kind,
    assetIn,
    assetOut,
    amount,
    rpcUrl,
    chainId,
}: SingleSwapInput): Promise<bigint> => {
    const publicClient = createPublicClient({
        transport: http(rpcUrl),
    });

    const queriesContract = getContract({
        address: BALANCER_QUERIES[chainId],
        abi: balancerQueriesAbi,
        publicClient,
    });

    const swap: SingleSwap = {
        poolId,
        kind,
        assetIn,
        assetOut,
        amount,
        userData: '0x',
    };

    const { result } = await queriesContract.simulate.querySwap([
        swap,
        DEFAULT_FUND_MANAGMENT,
    ]);

    return result;
};
