import { BalancerApiClient } from '../../client';
import { API_CHAIN_NAMES } from '../../../../../utils/constants';
import { BufferState } from '@/entities';

export class Buffers {
    readonly bufferStateQuery = `
      query GetBufferState($wrappedTokenAddress: String!, $chain: GqlChain!) {
        tokenGetTokens(
        chains: [$chain],
          where: {tokensIn: [$wrappedTokenAddress]}
        ) {
          address
          decimals
          isErc4626
          underlyingTokenAddress
        }
      }
    `;

    constructor(private readonly balancerApiClient: BalancerApiClient) {}

    async fetchBufferState(wrappedTokenAddress: string): Promise<BufferState> {
        const { data } = await this.balancerApiClient.fetch({
            query: this.bufferStateQuery,
            variables: {
                wrappedTokenAddress: wrappedTokenAddress.toLowerCase(),
                // the API requires chain names to be sent as uppercase strings
                chain: API_CHAIN_NAMES[this.balancerApiClient.chainId],
            },
        });
        if (!data.isErc4626) {
            throw new Error(
                `Wrapped token address provided is not an ERC4626: ${wrappedTokenAddress}`,
            );
        }
        const bufferState: BufferState = {
            wrappedToken: {
                address: data.address,
                decimals: data.decimals,
            },
            underlyingToken: {
                address: data.underlyingTokenAddress,
                decimals: data.decimals,
            },
        };
        return bufferState;
    }
}
