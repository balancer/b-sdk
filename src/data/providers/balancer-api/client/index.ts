import { ChainId } from '../../../../utils';

export class BalancerApiClient {
    apiUrl: string;
    chainId: ChainId;
    constructor(apiUrl: string, chainId: ChainId) {
        this.apiUrl = apiUrl;
        this.chainId = chainId;
    }

    async fetch(requestQuery: {
        operationName?: string;
        query: string;
        variables?: Record<string, string>;
    }) {
        const response = await fetch(this.apiUrl, {
            method: 'post',
            body: JSON.stringify(requestQuery),
            headers: {
                'Content-Type': 'application/json',
                ChainId: this.chainId.toString(),
            },
        });
        return response.json();
    }
}
