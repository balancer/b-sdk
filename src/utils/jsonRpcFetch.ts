import fetch from 'node-fetch';
import { ZERO_ADDRESS } from './constants';
import { FunctionFragment } from '@ethersproject/abi';
import { Interface } from '@ethersproject/abi';

export async function jsonRpcFetch<T>({
    rpcUrl,
    from = ZERO_ADDRESS,
    to,
    contractInterface,
    functionFragment,
    values,
}: {
    rpcUrl: string;
    from?: string;
    to: string;
    contractInterface: Interface;
    functionFragment: FunctionFragment | string;
    values?: ReadonlyArray<any>;
}): Promise<T> {
    const data = contractInterface.encodeFunctionData(functionFragment, values);

    const rawResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'eth_call',
            params: [{ from, to, data }, 'latest'],
        }),
    });

    const content = await rawResponse.json();

    return contractInterface.decodeFunctionResult('getPoolData', content.result) as unknown as T;
}
