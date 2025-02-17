import { createPublicClient, http } from 'viem';
import { Address } from '../../types';
import { BALANCER_QUERIES, CHAINS } from '../../utils';
import { balancerQueriesAbi } from '../../abi';
import { ExitPoolRequest } from '../removeLiquidity/types';

export async function doRemoveLiquidityQuery(
    rpcUrl: string,
    chainId: number,
    args: readonly [Address, Address, Address, ExitPoolRequest],
): Promise<{
    bptIn: bigint;
    amountsOut: readonly bigint[];
}> {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const {
        result: [bptIn, amountsOut],
    } = await client.simulateContract({
        address: BALANCER_QUERIES[chainId],
        abi: balancerQueriesAbi,
        functionName: 'queryExit',
        args,
    });

    return {
        bptIn,
        amountsOut,
    };
}
