import { createPublicClient, http } from 'viem';
import { CHAINS } from '../../utils';

export async function doAddLiquidityQueryV3(
    rpcUrl: string,
    chainId: number,
    args: {},
): Promise<{
    bptOut: bigint;
    amountsIn: readonly bigint[];
}> {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    // TODO Add Query V3
    return {
        bptOut: 0n,
        amountsIn: [],
    };
}
