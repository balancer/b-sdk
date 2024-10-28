import {
    createPublicClient,
    decodeAbiParameters,
    decodeFunctionResult,
    Hex,
    http,
} from 'viem';
import { balancerRelayerAbi } from '@/abi';
import { BALANCER_RELAYER, ChainId, CHAINS, EMPTY_SENDER } from '@/utils';

export const doRemoveLiquidityNestedQuery = async (
    chainId: ChainId,
    rpcUrl: string,
    encodedMulticall: Hex,
    tokensOutIndexes: number[],
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { data } = await client.call({
        ...EMPTY_SENDER,
        to: BALANCER_RELAYER[chainId],
        data: encodedMulticall,
    });

    const result = decodeFunctionResult({
        abi: balancerRelayerAbi,
        functionName: 'vaultActionsQueryMulticall',
        data: data as Hex,
    });

    const peekedValues: bigint[] = [];

    result.forEach((r, i) => {
        if (tokensOutIndexes.includes(i))
            peekedValues.push(decodeAbiParameters([{ type: 'uint256' }], r)[0]);
    });

    return peekedValues;
};
