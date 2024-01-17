import { createPublicClient, getContract, http } from 'viem';
import { BALANCER_QUERIES, ChainId, DEFAULT_FUND_MANAGMENT } from '../../utils';
import { SingleSwap } from '../../types';
import { balancerQueriesAbi } from '../../abi';

export type SingleSwapInput = SingleSwap & {
    rpcUrl: string;
    chainId: ChainId;
};

export const doSingleSwapQuery = async ({
    rpcUrl,
    chainId,
    ...swap
}: SingleSwapInput): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
    });

    const queriesContract = getContract({
        address: BALANCER_QUERIES[chainId],
        abi: balancerQueriesAbi,
        client,
    });

    const { result } = await queriesContract.simulate.querySwap([
        swap,
        DEFAULT_FUND_MANAGMENT,
    ]);

    return result;
};
