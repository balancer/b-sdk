import { Pools } from "./modules/pool-state";
import { BalancerApiClient } from "./client";

export default class BalancerApi {
  
  balancerApiClient: BalancerApiClient;
  pools: Pools;
  
  
  constructor(balancerApiUrl: string, chainId: number){
    this.balancerApiClient = new BalancerApiClient(balancerApiUrl, chainId);
    this.pools = new Pools(this.balancerApiClient);
  }
  
  
}