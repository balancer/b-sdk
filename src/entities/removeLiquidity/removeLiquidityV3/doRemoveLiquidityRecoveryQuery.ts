import { balancerRouterAbi } from '@/abi';
import { BALANCER_ROUTER, CHAINS } from '@/utils';
import { createPublicClient, http } from 'viem';
import { RemoveLiquidityRecoveryInput } from '../types';
import { Address } from '@/types';

export const doRemoveLiquidityRecoveryQuery = async (
    { chainId, rpcUrl, bptIn }: RemoveLiquidityRecoveryInput,
    poolAddress: Address,
): Promise<readonly bigint[]> => {
    // remove liquidity recovery requires bptAmountsIn and returns amountsOut
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    // TODO: Implement this once new Router has been deployed.
    /* const { result: amountsOut } = await client.simulateContract({
        address: BALANCER_ROUTER[chainId],
        abi: balancerRouterAbi,
        functionName: 'queryRemoveLiquidityRecovery',
        args: [poolAddress, bptIn.rawAmount],
    }); */
    //return amountsOut;

    // currently using sample data as the new Router has not been deployed
    return [1047349725497226165n, 1178552501836039005n];
};
