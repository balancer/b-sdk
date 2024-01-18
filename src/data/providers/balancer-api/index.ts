import { Pools } from './modules/pool-state';
import { BalancerApiClient } from './client';
import { ChainId } from '../../../utils';
import { NestedPools } from './modules/nested-pool-state';

export class BalancerApi {
    balancerApiClient: BalancerApiClient;
    pools: Pools;
    nestedPools: NestedPools;

    constructor(balancerApiUrl: string, chainId: ChainId) {
        this.balancerApiClient = new BalancerApiClient(balancerApiUrl, chainId);
        this.pools = new Pools(this.balancerApiClient);
        this.nestedPools = new NestedPools(this.balancerApiClient);
    }
}
