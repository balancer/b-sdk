import { BalancerApiClient } from '../../client';
import { ChainId } from '@/utils';
import { Address, Chain } from 'viem';
import { SwapKind } from '@/types';
import { TokenAmount } from '@/entities';
import { API_CHAIN_NAMES } from '@/utils/constants';
import { Path } from '@/entities/swap/paths/types';
import { gql } from 'graphql-tag';
import { DocumentNode, print } from 'graphql';
import {
    sorGetSwapPathsQuery,
    sorGetSwapPathsQueryVariables,
    GqlChain,
} from '../../generated/types';

// Re-export the original type for backward compatibility
export type SorInput = {
    chainId: ChainId;
    tokenIn: Address;
    tokenOut: Address;
    swapKind: SwapKind;
    swapAmount: TokenAmount; // API expects input in human readable form
    useProtocolVersion?: 2 | 3; // If not specified API will return best
    poolIds?: Address[]; // If specified, API will return only paths that contain these poolIds
    considerPoolsWithHooks?: boolean; // If true, API will return paths that contain pools with hooks
};

export class SorSwapPaths {
    readonly sorSwapPathQuery: DocumentNode = gql`
  query sorGetSwapPaths(
    $chain: GqlChain!
    $swapType: GqlSorSwapType!
    $swapAmount: AmountHumanReadable!
    $tokenIn: String!
    $tokenOut: String!
    $considerPoolsWithHooks: Boolean
    $poolIds: [String!]
  ) {
    sorGetSwapPaths(
      swapAmount: $swapAmount
      chain: $chain
      swapType: $swapType
      tokenIn: $tokenIn
      tokenOut: $tokenOut
      considerPoolsWithHooks: $considerPoolsWithHooks
      poolIds: $poolIds
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
        isBuffer
        protocolVersion
        tokens {
          address
          decimals
        }
      }
    }
  }
`;
    readonly sorSwapPathQueryWithVersion: DocumentNode = gql`
  query sorGetSwapPathsWithVersion(
    $chain: GqlChain!
    $swapType: GqlSorSwapType!
    $swapAmount: AmountHumanReadable!
    $tokenIn: String!
    $tokenOut: String!
    $useProtocolVersion: Int!
    $poolIds: [String!]
    $considerPoolsWithHooks: Boolean
  ) {
    sorGetSwapPaths(
      swapAmount: $swapAmount
      chain: $chain
      swapType: $swapType
      tokenIn: $tokenIn
      tokenOut: $tokenOut
      useProtocolVersion: $useProtocolVersion
      considerPoolsWithHooks: $considerPoolsWithHooks
      poolIds: $poolIds
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
        isBuffer
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
        const baseVariables: sorGetSwapPathsQueryVariables = {
            chain: this.mapGqlChain(sorInput.chainId) as GqlChain,
            swapAmount: sorInput.swapAmount.toSignificant(
                sorInput.swapAmount.token.decimals,
            ), // Must use human scale
            swapType:
                sorInput.swapKind === SwapKind.GivenIn
                    ? 'EXACT_IN'
                    : 'EXACT_OUT',
            tokenIn: sorInput.tokenIn,
            tokenOut: sorInput.tokenOut,
            considerPoolsWithHooks: sorInput.considerPoolsWithHooks ?? true,
        };

        // Add poolIds only if provided
        if (sorInput.poolIds && sorInput.poolIds.length > 0) {
            baseVariables.poolIds = sorInput.poolIds;
        }

        const variables = sorInput.useProtocolVersion
            ? {
                  ...baseVariables,
                  useProtocolVersion: sorInput.useProtocolVersion,
              }
            : baseVariables;

        const { data } = await this.balancerApiClient.fetch({
            query: sorInput.useProtocolVersion
                ? print(this.sorSwapPathQueryWithVersion)
                : print(this.sorSwapPathQuery),
            variables: variables as Record<
                string,
                string | boolean | string[] | number
            >,
        });

        // Now data is fully typed as sorGetSwapPathsQuery
        const apiResponse: sorGetSwapPathsQuery = data;
        const sorData = apiResponse.sorGetSwapPaths;

        const paths: Path[] = sorData.paths.map((apiPath) => ({
            pools: apiPath.pools as Address[],
            isBuffer: apiPath.isBuffer,
            tokens: apiPath.tokens.map((token) => ({
                address: token.address as Address,
                decimals: token.decimals,
            })),
            outputAmountRaw: BigInt(apiPath.outputAmountRaw),
            inputAmountRaw: BigInt(apiPath.inputAmountRaw),
            protocolVersion: apiPath.protocolVersion as 1 | 2 | 3,
        }));
        return paths;
    }

    public mapGqlChain(chainId: ChainId): string {
        const mapped = API_CHAIN_NAMES[chainId];
        if (!mapped) throw Error(`Unsupported API chain: ${chainId}`);
        return mapped;
    }
}
