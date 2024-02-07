import { Pools } from './modules/pool-state';
import { BalancerApiClient } from './client';
import { ChainId } from '../../../utils';
import { NestedPools } from './modules/nested-pool-state';
import { SorGetQuote } from './modules/sorGetQuote';

export { GetQuoteInput } from './modules/sorGetQuote';

export class BalancerApi {
    balancerApiClient: BalancerApiClient;
    pools: Pools;
    nestedPools: NestedPools;
    sorGetQuote: SorGetQuote;

    constructor(balancerApiUrl: string, chainId: ChainId) {
        this.balancerApiClient = new BalancerApiClient(balancerApiUrl, chainId);
        this.pools = new Pools(this.balancerApiClient);
        this.nestedPools = new NestedPools(this.balancerApiClient);
        this.sorGetQuote = new SorGetQuote(this.balancerApiClient);
    }
}
