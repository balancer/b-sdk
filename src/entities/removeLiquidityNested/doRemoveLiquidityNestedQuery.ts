import {
    createPublicClient,
    decodeAbiParameters,
    decodeFunctionResult,
    http,
} from 'viem';
import { Hex } from '../../types';
import { BALANCER_RELAYER, CHAINS, ChainId, EMPTY_SENDER } from '../../utils';
import { balancerRelayerAbi } from '../../abi';

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
