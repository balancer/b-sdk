
import { BalancerApi } from "../src/data/providers/balancer-api";

const balancerApiUrl = 'https://backend-v3-canary.beets-ftm-node.com/graphql';
const poolId = '0x481c5fc05d63a58aa2f0f2aa417c021b5d419cb200000000000000000000056a';
const join = async () => {
  const balancerApi = new BalancerApi(balancerApiUrl, 1);
  const poolState = await balancerApi.pools.fetchPoolState(poolId);
  console.log(poolState);
}

join();