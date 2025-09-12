import { BalancerApiClient } from '../../client';
import { ChainId } from '@/utils';
import { Address, Chain } from 'viem';
import { SwapKind } from '@/types';
import { TokenAmount } from '@/entities';
import { API_CHAIN_NAMES } from '@/utils/constants';
import { Path } from '@/entities/swap/paths/types';
import { ApiSorInput, ApiSorSwapPathsResponse } from '../../types';

// Re-export the shared type for backward compatibility
export type SorInput = ApiSorInput;

export class SorSwapPaths {
    readonly sorSwapPathQuery = `
  query MyQuery($chain: GqlChain!, $swapType: GqlSorSwapType!, $swapAmount: AmountHumanReadable!, $tokenIn: String!, $tokenOut: String!, $considerPoolsWithHooks: Boolean, $poolIds: [String!]) {
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
    readonly sorSwapPathQueryWithVersion = `
  query MyQuery($chain: GqlChain!, $swapType: GqlSorSwapType!, $swapAmount: AmountHumanReadable!, $tokenIn: String!, $tokenOut: String!, $useProtocolVersion: Int!, $poolIds: [String!], $considerPoolsWithHooks: Boolean) {
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
        const baseVariables: {
            chain: string;
            swapAmount: string;
            swapType: string;
            tokenIn: Address;
            tokenOut: Address;
            considerPoolsWithHooks: boolean;
            poolIds?: Address[];
        } = {
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
                ? this.sorSwapPathQueryWithVersion
                : this.sorSwapPathQuery,
            variables,
        });
        const sorResponse: ApiSorSwapPathsResponse = data.sorGetSwapPaths;
        const paths: Path[] = sorResponse.paths.map(apiPath => ({
            pools: apiPath.pools as Address[],
            isBuffer: [apiPath.isBuffer], // Convert boolean to boolean[]
            tokens: apiPath.tokens.map(token => ({
                address: token.address,
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
