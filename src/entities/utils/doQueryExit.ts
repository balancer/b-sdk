import { createPublicClient, http } from 'viem';
import { Address } from '../../types';
import { BALANCER_HELPERS, CHAINS } from '../../utils';
import { balancerHelpersAbi } from '../../abi';
import { ExitPoolRequest } from '../exit';

export async function doQueryExit(
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
        address: BALANCER_HELPERS[chainId],
        abi: balancerHelpersAbi,
        functionName: 'queryExit',
        args,
    });

    return {
        bptIn,
        amountsOut,
    };
}
