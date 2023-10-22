import { ChainId } from '../../../../utils';

export class BalancerApiClient {
    apiUrl: string;
    chainId: ChainId;
    constructor(apiUrl: string, chainId: number) {
        this.apiUrl = apiUrl;
        this.chainId = chainId;
    }

    async fetch(
        operationName: string,
        query: string,
        variables: { id: string },
    ) {
        const requestQuery = {
            operationName,
            query,
            variables,
        };
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
