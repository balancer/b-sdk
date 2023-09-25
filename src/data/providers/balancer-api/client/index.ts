export class BalancerApiClient {
  apiUrl: string;
  chainId: number;
  constructor(apiUrl: string, chainId: number) {
    this.apiUrl = apiUrl;
    this.chainId = chainId;
  }

  async fetch(operationName: string, query: any, variables: any) {
    const requestQuery = {
      operationName,
      query,
      variables,
    };
    const response = await fetch(this.apiUrl, {
      method: 'post',
      body: JSON.stringify(requestQuery),
      headers: { 'Content-Type': 'application/json', ChainId: this.chainId.toString() },
    });
    return response.json();
  }
}
