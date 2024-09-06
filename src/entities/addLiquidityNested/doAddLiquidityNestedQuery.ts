import {
    createPublicClient,
    decodeAbiParameters,
    decodeFunctionResult,
    http,
} from 'viem';
import { Hex } from '../../types';
import { BALANCER_RELAYER, CHAINS, ChainId } from '../../utils';
import {
    balancerRelayerAbi,
    permit2Abi,
    vaultExtensionV3Abi,
    vaultV3Abi,
} from '../../abi';

export const doAddLiquidityNestedQuery = async (
    chainId: ChainId,
    rpcUrl: string,
    encodedMulticall: Hex,
): Promise<bigint> => {
    const client = createPublicClient({
        transport: http(rpcUrl),
        chain: CHAINS[chainId],
    });

    const { data } = await client.call({
        to: BALANCER_RELAYER[chainId],
        data: encodedMulticall,
    });

    const result = decodeFunctionResult({
        abi: [
            ...balancerRelayerAbi,
            ...vaultV3Abi,
            ...vaultExtensionV3Abi,
            ...permit2Abi,
        ],
        functionName: 'vaultActionsQueryMulticall',
        data: data as Hex,
    });

    const peekedValue = decodeAbiParameters(
        [{ type: 'uint256' }],
        result[result.length - 1],
    )[0];

    return peekedValue;
};
