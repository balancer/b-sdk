import {
    createPublicClient,
    decodeAbiParameters,
    decodeFunctionResult,
    http,
} from 'viem';
import { Hex } from '../../types';
import { BALANCER_RELAYER, CHAINS } from '../../utils';
import { balancerRelayerAbi } from '../../abi';
import { NestedJoinInput } from './types';

export async function doQueryNestedJoin(
    input: NestedJoinInput,
    encodedMulticall: Hex,
) {
    const client = createPublicClient({
        transport: http(input.rpcUrl),
        chain: CHAINS[input.chainId],
    });

    const { data } = await client.call({
        account: input.testAddress,
        to: BALANCER_RELAYER[input.chainId],
        data: encodedMulticall,
    });

    const result = decodeFunctionResult({
        abi: balancerRelayerAbi,
        functionName: 'vaultActionsQueryMulticall',
        data: data as Hex,
    });

    const peekedValue = decodeAbiParameters(
        [{ type: 'uint256' }],
        result[result.length - 1],
    )[0];

    return peekedValue;
}
