import { BalancerApiClient } from '../../client';
import { ChainId } from '@/utils';
import { Address, Chain } from 'viem';
import { SwapKind } from '@/types';
import { TokenAmount } from '@/entities';
import { Path } from '@/entities/swap/paths/types';

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
        const poolGetPool: Path[] = data.sorGetSwapPaths.paths;
        return poolGetPool;
    }

    public mapGqlChain(chainId: ChainId): string {
        switch (chainId) {
            case ChainId.ARBITRUM_ONE:
                return 'ARBITRUM';
            case ChainId.AVALANCHE:
                return 'AVALANCHE';
            case ChainId.FANTOM:
                return 'FANTOM';
            case ChainId.GNOSIS_CHAIN:
                return 'GNOSIS';
            case ChainId.MAINNET:
                return 'MAINNET';
            case ChainId.OPTIMISM:
                return 'OPTIMISM';
            case ChainId.POLYGON:
                return 'POLYGON';
            case ChainId.ZKEVM:
                return 'ZKEVM';
            case ChainId.SEPOLIA:
                return 'SEPOLIA';
            case ChainId.BASE:
                return 'BASE';
            case ChainId.SONIC:
                return 'SONIC';
            case ChainId.HYPEREVM:
                return 'HYPEREVM';
            case ChainId.FRAXTAL:
                return 'FRAXTAL';
            case ChainId.MODE:
                return 'MODE';
            case ChainId.ZKSYNC:
                return 'ZKSYNC';

            default:
                throw Error(`Unsupported API chain: ${chainId}`);
        }
    }
}
