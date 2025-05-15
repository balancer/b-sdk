import { Pools } from './modules/pool-state';
import { BalancerApiClient, BalancerApiClientOptions } from './client';
import { ChainId } from '../../../utils';
import { NestedPools } from './modules/nested-pool-state';
import { SorSwapPaths } from './modules/sorSwapPaths';
import { Buffers } from './modules/buffer-state';
import { BoostedPools } from './modules/boosted-pool-state';

export { SorInput as GetQuoteInput } from './modules/sorSwapPaths';
export {
    mapPoolToNestedPoolStateV2,
    mapPoolToNestedPoolStateV3,
    PoolGetPool,
} from './modules/nested-pool-state';

export class BalancerApi {
    balancerApiClient: BalancerApiClient;
    pools: Pools;
    boostedPools: BoostedPools;
    nestedPools: NestedPools;
    sorSwapPaths: SorSwapPaths;
    buffers: Buffers;

    /**
     * Create a new instance of the Balancer API client
     *
     * @param balancerApiUrl The URL of the Balancer API endpoint
     * @param chainId The blockchain chain ID
     * @param options Optional client configuration for name and version
     */
    constructor(
        balancerApiUrl: string,
        chainId: ChainId,
        options?: BalancerApiClientOptions,
    ) {
        this.balancerApiClient = new BalancerApiClient(
            balancerApiUrl,
            chainId,
            options,
        );
        this.pools = new Pools(this.balancerApiClient);
        this.boostedPools = new BoostedPools(this.balancerApiClient);
        this.nestedPools = new NestedPools(this.balancerApiClient);
        this.sorSwapPaths = new SorSwapPaths(this.balancerApiClient);
        this.buffers = new Buffers(this.balancerApiClient);
    }
}
