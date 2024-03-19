import {
    createPublicClient,
    decodeAbiParameters,
    decodeFunctionResult,
    http,
} from 'viem';
import { Hex } from '../../types';
import { BALANCER_RELAYER, CHAINS, ChainId } from '../../utils';
import { balancerRelayerAbi } from '../../abi';

export const doRemoveLiquidityNestedQuery = async (
    chainId: ChainId,
    rpcUrl: string,
    encodedMulticall: Hex,
    tokensOutLength: number,
): Promise<bigint[]> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { data } = await client.call({
        to: BALANCER_RELAYER[chainId],
        data: encodedMulticall,
    });

    const result = decodeFunctionResult({
        abi: balancerRelayerAbi,
        functionName: 'vaultActionsQueryMulticall',
        data: data as Hex,
    });

    const resultsToPeek = result.slice(result.length - tokensOutLength);

    const peekedValues = resultsToPeek.map(
        (r) => decodeAbiParameters([{ type: 'uint256' }], r)[0],
    );

    return peekedValues;
};
