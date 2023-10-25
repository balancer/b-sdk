import { Pools } from './modules/pool-state';
import { BalancerApiClient } from './client';
import { ChainId } from '../../../utils';

export class BalancerApi {
    balancerApiClient: BalancerApiClient;
    pools: Pools;

    constructor(balancerApiUrl: string, chainId: ChainId) {
        this.balancerApiClient = new BalancerApiClient(balancerApiUrl, chainId);
        this.pools = new Pools(this.balancerApiClient);
    }
}
