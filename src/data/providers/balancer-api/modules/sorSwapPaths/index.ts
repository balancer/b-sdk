import { BalancerApiClient } from '../../client';
import { ChainId } from '@/utils';
import { Address } from 'viem';
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
};

export class SorSwapPaths {
    readonly sorSwapPathQuery = `
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
    readonly sorSwapPathQueryWithVersion = `
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
        const poolGetPool: Path[] = data.sorGetSwapPaths.paths;
        return poolGetPool;
    }

    private mapGqlChain(chainId: ChainId): string {
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
            default:
                throw Error(`Unsupported API chain: ${chainId}`);
        }
    }
}
