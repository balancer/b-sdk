import { ChainId } from '../../../../utils';

export class BalancerApiClient {
    apiUrl: string;
    chainId: ChainId;
    clientName: string;
    clientVersion: string;

    constructor(apiUrl: string, chainId: ChainId) {
        this.apiUrl = apiUrl;
        this.chainId = chainId;

        this.clientName = process.env.API_CLIENT_NAME || 'balancer-sdk';
        this.clientVersion = process.env.API_CLIENT_VERSION || __PACKAGE_VERSION__;
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
                'x-graphql-client-name': this.clientName,
                'x-graphql-client-version': this.clientVersion,
            },
        });
        return response.json();
    }
}
