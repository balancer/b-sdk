import {
    createPublicClient,
    decodeAbiParameters,
    decodeFunctionResult,
    http,
} from 'viem';
import { Hex } from '../../../types';
import {
    BALANCER_RELAYER,
    CHAINS,
    ChainId,
    EMPTY_SENDER,
} from '../../../utils';
import { balancerRelayerAbiExtended } from '../../../abi';

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
        ...EMPTY_SENDER,
        to: BALANCER_RELAYER[chainId],
        data: encodedMulticall,
    });

    const result = decodeFunctionResult({
        abi: balancerRelayerAbiExtended,
        functionName: 'vaultActionsQueryMulticall',
        data: data as Hex,
    });

    const peekedValue = decodeAbiParameters(
        [{ type: 'uint256' }],
        result[result.length - 1],
    )[0];

    return peekedValue;
};
