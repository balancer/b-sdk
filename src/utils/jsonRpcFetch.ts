import fetch from 'isomorphic-fetch';
import { ZERO_ADDRESS } from './constants';
import { FunctionFragment, Interface } from '@ethersproject/abi';
import { hexValue } from '@ethersproject/bytes';
import { SwapOptions } from '../types';
import { BigNumber } from '@ethersproject/bignumber';

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
    options?: SwapOptions;
}): Promise<T> {
    const data = contractInterface.encodeFunctionData(functionFragment, values);

    let block: string;
    if (options?.block) {
        block = hexValue(options.block);
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

    if (content.error) {
        throw new Error(content.error);
    }

    return contractInterface.decodeFunctionResult('getPoolData', content.result) as unknown as T;
}

export async function jsonRpcGetBlockTimestampByNumber({
    rpcUrl,
    blockNumber,
}: {
    rpcUrl: string;
    blockNumber: number;
}) {
    const rawResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'eth_getBlockByNumber',
            params: [hexValue(blockNumber), false],
        }),
    });

    const content = await rawResponse.json();

    return BigNumber.from(content.result.timestamp).toNumber();
}
