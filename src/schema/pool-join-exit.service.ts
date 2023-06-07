import { Address, BalancerBasePool, BalancerPoolType } from "./pool-schema";
import { Token } from "../entities";
import {
  BalancerJoinBptOutAndPriceImpactForTokensInOutput,
  PoolJoinContractCallData,
  PoolJoinData,
  PoolService,
} from "./service-schema";

//TODO: should we pass in the class instances here or is an object easier to manage?
interface TokenAmount {
  address: Address;
  amount: BigInt;
  decimals: number; //TODO: is this needed?
}

// the below is simply a reference impl. There is likely to be some shared logic
// that can be lifted into the BalancerPoolJoinExitService so that the individual PoolService's
// are as minimal as possible
export class BalancerPoolJoinExitService {
  constructor(private readonly services: PoolService[]) {}

  // given an array of token balances, determine the max proportional investable amount
  public async getMaxProportionalForUserBalances(
    pool: BalancerBasePool,
    userInvestTokenBalances: TokenAmount[]
  ): Promise<TokenAmount[]> {
    const service = this.getServiceForPool(pool);

    return service.getMaxProportionalForUserBalances(
      pool,
      userInvestTokenBalances
    );
  }

  public async getProportionalSuggestionForFixedAmount(
    pool: BalancerBasePool,
    fixedAmount: TokenAmount,
    tokensIn: Token[]
  ): Promise<TokenAmount[]> {
    const service = this.getServiceForPool(pool);

    return service.getProportionalSuggestionForFixedAmount(
      pool,
      fixedAmount,
      tokensIn
    );
  }

  public async getBptOutAndPriceImpactForTokensIn(
    pool: BalancerBasePool,
    tokenAmountsIn: TokenAmount[]
  ): Promise<BalancerJoinBptOutAndPriceImpactForTokensInOutput> {
    const service = this.getServiceForPool(pool);

    return service.getBptOutAndPriceImpactForTokensIn(pool, tokenAmountsIn);
  }

  public async getContractCallData(
    pool: BalancerBasePool,
    data: PoolJoinData
  ): Promise<PoolJoinContractCallData> {
    const service = this.getServiceForPool(pool);

    return service.getContractCallData(pool, data);
  }

  private getServiceForPool(pool: BalancerBasePool): PoolService {
    for (const service of this.services) {
      if (service.supportsPool(pool)) {
        return service;
      }
    }

    throw new Error("Unsupported pool");
  }
}
