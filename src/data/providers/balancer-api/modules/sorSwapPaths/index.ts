import { TokenAmount } from '@/entities';
import { Path } from '@/entities/swap/paths/types';
import { SwapKind } from '@/types';
import { API_CHAIN_NAMES, ChainId } from '@/utils';
import { Address } from 'viem';

import { BalancerApiClient } from '../../client';

export type SorInput = {
    chainId: ChainId;
    tokenIn: Address;
    tokenOut: Address;
    swapKind: SwapKind;
    swapAmount: TokenAmount; // API expects input in human readable form
    useProtocolVersion?: 2 | 3; // If not specified API will return best
};

export type SorSwapResult = {
    paths: Path[];
    routes: SorRoute[];
    priceImpact: {
        error: string | null;
        priceImpact: string;
    };
};

// FIXME: these types should exist within the GQL schema
// NOTE: there exists a priceImpact query and typings for this but these are tightly coupled to addLiquidity operations
export type SorPriceImpact = {
    error: string | null;
    priceImpact: string;
};

export type SorHop = {
    poolId: string;
    tokenIn: string;
    tokenInAmount: string;
    tokenOut: string;
    tokenOutAmount: string;
    pool: {
        symbol: string;
    };
};

export type SorRoute = {
    share: string;
    tokenInAmount: string;
    tokenOut: string;
    tokenOutAmount: string;
    hops: SorHop[];
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
      routes {
        share
        tokenInAmount
        tokenOut
        tokenOutAmount
        hops {
          poolId
          tokenIn
          tokenInAmount
          tokenOut
          tokenOutAmount
          pool {
            symbol
          }
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
      routes {
        share
        tokenInAmount
        tokenOut
        tokenOutAmount
        hops {
          poolId
          tokenIn
          tokenInAmount
          tokenOut
          tokenOutAmount
          pool {
            symbol
          }
        }
      }
    }
  }
`;

    constructor(private readonly balancerApiClient: BalancerApiClient) {}

    async fetchSorSwapPaths(sorInput: SorInput): Promise<SorSwapResult> {
        const variables = {
            chain: this.mapGqlChain(sorInput.chainId),
            swapAmount: sorInput.swapAmount.toSignificant(
                sorInput.swapAmount.token.decimals,
            ), // Must use human scale
            swapType:
                sorInput.swapKind === SwapKind.GivenIn
                    ? 'EXACT_IN'
                    : 'EXACT_OUT',
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
        const paths: Path[] = data.sorGetSwapPaths.paths;
        const priceImpact: SorPriceImpact = data.sorGetSwapPaths.priceImpact;
        const routes: SorRoute[] = data.sorGetSwapPaths.routes;

        return { paths, priceImpact, routes };
    }

    private mapGqlChain(chainId: ChainId): string {
        if (chainId in API_CHAIN_NAMES) {
            return API_CHAIN_NAMES[chainId];
        } else throw Error(`Unsupported API chain: ${chainId}`);
    }
}
