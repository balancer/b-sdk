import { ChainId } from '../../../utils';
import { BalancerApiClient } from './client';
import { NestedPools } from './modules/nested-pool-state';
import { Pools } from './modules/pool-state';
import { SorSwapPaths } from './modules/sorSwapPaths';

export {
    SorInput as GetQuoteInput,
    SorHop,
    SorRoute,
    SorSwapResult,
} from './modules/sorSwapPaths';
export {
    mapPoolToNestedPoolState,
    PoolGetPool,
} from './modules/nested-pool-state';

export class BalancerApi {
    balancerApiClient: BalancerApiClient;
    pools: Pools;
    nestedPools: NestedPools;
    sorSwapPaths: SorSwapPaths;

    constructor(balancerApiUrl: string, chainId: ChainId) {
        this.balancerApiClient = new BalancerApiClient(balancerApiUrl, chainId);
        this.pools = new Pools(this.balancerApiClient);
        this.nestedPools = new NestedPools(this.balancerApiClient);
        this.sorSwapPaths = new SorSwapPaths(this.balancerApiClient);
    }
}
