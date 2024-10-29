import { TokenAmount } from "@/entities";
import { Path } from "@/entities/swap/paths/types";
import { SwapKind } from "@/types";
import { API_CHAIN_NAMES, ChainId } from "@/utils";
import { Address } from "viem";

import { BalancerApiClient } from "../../client";

export type SorInput = {
  chainId: ChainId;
  tokenIn: Address;
  tokenOut: Address;
  swapKind: SwapKind;
  swapAmount: TokenAmount; // API expects input in human readable form
  useProtocolVersion?: 2 | 3; // If not specified API will return best
};

export class SorSwapPaths {
  readonly sorSwapPathQuery = `#graphql
  query MyQuery($chain: GqlChain!, $swapType: GqlSorSwapType!, $swapAmount: AmountHumanReadable!, $tokenIn: String!, $tokenOut: String!) {
    sorGetSwapPaths(
    swapAmount: $swapAmount
    chain: $chain
    swapType: $swapType
    tokenIn: $tokenIn
    tokenOut: $tokenOut
    ) {
      tokenInAmount
      tokenOutAmount
      returnAmount
      priceImpact {
        error
        priceImpact
      }
      swapAmount
      paths {
        inputAmountRaw
        outputAmountRaw
        pools
        protocolVersion
        tokens {
          address
          decimals
        }
      }
    }
  }
`;
  readonly sorSwapPathQueryWithVersion = `#graphql
  query MyQuery($chain: GqlChain!, $swapType: GqlSorSwapType!, $swapAmount: AmountHumanReadable!, $tokenIn: String!, $tokenOut: String!, $useProtocolVersion: Int!) {
    sorGetSwapPaths(
    swapAmount: $swapAmount
    chain: $chain
    swapType: $swapType
    tokenIn: $tokenIn
    tokenOut: $tokenOut
    useProtocolVersion: $useProtocolVersion
    ) {
      tokenInAmount
      tokenOutAmount
      returnAmount
      priceImpact {
        error
        priceImpact
      }
      swapAmount
      paths {
        inputAmountRaw
        outputAmountRaw
        pools
        protocolVersion
        tokens {
          address
          decimals
        }
      }
    }
  }
`;

  constructor(private readonly balancerApiClient: BalancerApiClient) {}

  async fetchSorSwapPaths(sorInput: SorInput): Promise<Path[]> {
    const variables = {
      chain: this.mapGqlChain(sorInput.chainId),
      swapAmount: sorInput.swapAmount.toSignificant(
        sorInput.swapAmount.token.decimals,
      ), // Must use human scale
      swapType:
        sorInput.swapKind === SwapKind.GivenIn ? "EXACT_IN" : "EXACT_OUT",
      tokenIn: sorInput.tokenIn,
      tokenOut: sorInput.tokenOut,
    };
    const { data } = await this.balancerApiClient.fetch({
      query: sorInput.useProtocolVersion
        ? this.sorSwapPathQueryWithVersion
        : this.sorSwapPathQuery,
      variables: sorInput.useProtocolVersion
        ? {
            ...variables,
            useProtocolVersion: sorInput.useProtocolVersion,
          }
        : variables,
    });
    const poolGetPool: Path[] = data.sorGetSwapPaths.paths;
    return poolGetPool;
  }

  private mapGqlChain(chainId: ChainId): string {
    if (chainId in API_CHAIN_NAMES) {
      return API_CHAIN_NAMES[chainId];
    } else throw Error(`Unsupported API chain: ${chainId}`);
  }
}
