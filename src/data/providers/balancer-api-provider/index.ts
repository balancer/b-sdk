import { JoinData } from "./modules/join";
import { BalancerApiClient } from "./client";

export default class BalancerApi {
  
  balancerApiClient: BalancerApiClient;
  joinData: JoinData;
  
  
  constructor(balancerApiUrl: string, chainId: number){
    this.balancerApiClient = new BalancerApiClient(balancerApiUrl, chainId);
    this.joinData = new JoinData(this.balancerApiClient);
  }
  
  
}