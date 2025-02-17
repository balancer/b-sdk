import { createPublicClient, http } from 'viem';
import { Address } from '../../types';
import { BALANCER_QUERIES, CHAINS } from '../../utils';
import { balancerQueriesAbi } from '../../abi';
import { JoinPoolRequest } from '../addLiquidity/types';

export async function doAddLiquidityQuery(
    rpcUrl: string,
    chainId: number,
    args: readonly [Address, Address, Address, JoinPoolRequest],
): Promise<{
    bptOut: bigint;
    amountsIn: readonly bigint[];
}> {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const {
        result: [bptOut, amountsIn],
    } = await client.simulateContract({
        address: BALANCER_QUERIES[chainId],
        abi: balancerQueriesAbi,
        functionName: 'queryJoin',
        args,
    });
    return {
        bptOut,
        amountsIn,
    };
}
