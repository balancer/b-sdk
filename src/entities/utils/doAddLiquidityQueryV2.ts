import { createPublicClient, http } from 'viem';
import { Address } from '../../types';
import { BALANCER_HELPERS, CHAINS } from '../../utils';
import { balancerHelpersAbi } from '../../abi';

export async function doAddLiquidityQueryV2(
    rpcUrl: string,
    chainId: number,
    args: readonly [
        Address,
        Address,
        Address,
        {
            assets: readonly Address[];
            maxAmountsIn: readonly bigint[];
            userData: Address;
            fromInternalBalance: boolean;
        },
    ],
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
        address: BALANCER_HELPERS[chainId],
        abi: balancerHelpersAbi,
        functionName: 'queryJoin',
        args,
    });
    return {
        bptOut,
        amountsIn,
    };
}
