import fetch from 'isomorphic-fetch';
import { ZERO_ADDRESS } from './constants';
import { FunctionFragment } from '@ethersproject/abi';
import { Interface } from '@ethersproject/abi';
import { hexlify } from '@ethersproject/bytes';
import { LoadPoolsOptions } from '../data/types';

export async function jsonRpcFetch<T>({
    rpcUrl,
    from = ZERO_ADDRESS,
    to,
    contractInterface,
    functionFragment,
    values,
    options,
}: {
    rpcUrl: string;
    from?: string;
    to: string;
    contractInterface: Interface;
    functionFragment: FunctionFragment | string;
    values?: ReadonlyArray<any>;
    options?: LoadPoolsOptions;
}): Promise<T> {
    const data = contractInterface.encodeFunctionData(functionFragment, values);

    let block: string;
    if (options?.block) {
        block = hexlify(options.block);
    } else {
        block = 'latest';
    }

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
            params: [{ from, to, data }, block],
        }),
    });

    const content = await rawResponse.json();

    return contractInterface.decodeFunctionResult('getPoolData', content.result) as unknown as T;
}
