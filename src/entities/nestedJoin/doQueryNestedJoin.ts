import {
    createPublicClient,
    decodeAbiParameters,
    decodeFunctionResult,
    http,
} from 'viem';
import { Address, Hex } from '../../types';
import { BALANCER_RELAYER, CHAINS, ChainId } from '../../utils';
import { balancerRelayerAbi } from '../../abi';

export const doQueryNestedJoin = async (
    chainId: ChainId,
    rpcUrl: string,
    accountAddress: Address,
    encodedMulticall: Hex,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { data } = await client.call({
        account: accountAddress,
        to: BALANCER_RELAYER[chainId],
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
};
