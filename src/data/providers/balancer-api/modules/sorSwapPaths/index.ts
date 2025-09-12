import { BalancerApiClient } from '../../client';
import { ChainId } from '@/utils';
import { Address, Chain } from 'viem';
import { SwapKind } from '@/types';
import { TokenAmount } from '@/entities';
import { API_CHAIN_NAMES } from '@/utils/constants';
import { Path } from '@/entities/swap/paths/types';
import { gql } from 'graphql-tag';
import { DocumentNode, print } from 'graphql';
import { sorGetSwapPathsQuery, sorGetSwapPathsQueryVariables } from '../../generated/types';

// Re-export the original type for backward compatibility
export type SorInput = {
    chainId: number;
    swapAmount: { toSignificant: (decimals: number) => string; token: { decimals: number } };
    swapKind: 'GIVEN_IN' | 'GIVEN_OUT';
    tokenIn: Address;
    tokenOut: Address;
    considerPoolsWithHooks?: boolean;
    poolIds?: Address[];
    useProtocolVersion?: number;
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
            chain: this.mapGqlChain(sorInput.chainId) as any, // Cast to GqlChain
            swapAmount: sorInput.swapAmount.toSignificant(
                sorInput.swapAmount.token.decimals,
            ), // Must use human scale
            swapType:
                sorInput.swapKind === 'GIVEN_IN'
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

        // Convert to the format expected by the client
        const clientVariables: Record<string, string | number | boolean | string[]> = {
            chain: variables.chain as string,
            swapType: variables.swapType as string,
            swapAmount: variables.swapAmount,
            tokenIn: variables.tokenIn,
            tokenOut: variables.tokenOut,
            considerPoolsWithHooks: variables.considerPoolsWithHooks ?? true,
        };

        if (variables.poolIds) {
            clientVariables.poolIds = variables.poolIds;
        }

        if (sorInput.useProtocolVersion) {
            clientVariables.useProtocolVersion = sorInput.useProtocolVersion;
        }

        const { data } = await this.balancerApiClient.fetch({
            query: sorInput.useProtocolVersion
                ? print(this.sorSwapPathQueryWithVersion)
                : print(this.sorSwapPathQuery),
            variables: clientVariables,
        });

        // Now data is fully typed as sorGetSwapPathsQuery
        const apiResponse: sorGetSwapPathsQuery = data;
        const sorData = apiResponse.sorGetSwapPaths;
        
        const paths: Path[] = sorData.paths.map(apiPath => ({
            pools: apiPath.pools as Address[],
            isBuffer: apiPath.isBuffer,
            tokens: apiPath.tokens.map(token => ({
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
