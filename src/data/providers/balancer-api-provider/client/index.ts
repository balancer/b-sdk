export class BalancerApiClient {
  subgraphUrl: string;
  chainId: number;
  constructor(subgraphUrl: string, chainId: number) {
    this.subgraphUrl = subgraphUrl;
    this.chainId = chainId;
  }

  async fetch(operationName: string, query: any, variables: any) {
    const requestQuery = {
      operationName,
      query,
      variables,
    };
    const response = await fetch(this.subgraphUrl, {
      method: 'post',
      body: JSON.stringify(requestQuery),
      headers: { 'Content-Type': 'application/json', ChainId: this.chainId.toString() },
    });
    return response.json();
  }
}
