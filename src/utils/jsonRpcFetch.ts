import fetch from 'node-fetch';
import { ZERO_ADDRESS } from './constants';

export async function jsonRpcFetch({
    rpcUrl,
    from = ZERO_ADDRESS,
    to,
    data,
}: {
    rpcUrl: string;
    from?: string;
    to: string;
    data: string;
}): Promise<string> {
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

    return content.result;
}
