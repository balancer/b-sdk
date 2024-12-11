import { BalancerApiClient } from '../../client';
import { API_CHAIN_NAMES } from '../../../../../utils/constants';
import { BufferState } from '@/entities';
import { Address } from 'viem';

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
        const wrappedToken = data.tokenGetTokens[0] as {
            address: Address;
            decimals: number;
            isErc4626: boolean;
            underlyingTokenAddress: Address;
        };
        if (!wrappedToken.isErc4626) {
            throw new Error(
                `Wrapped token address provided is not an ERC4626: ${wrappedTokenAddress}`,
            );
        }
        const bufferState: BufferState = {
            wrappedToken: {
                address: wrappedToken.address,
                decimals: wrappedToken.decimals,
            },
            underlyingToken: {
                address: wrappedToken.underlyingTokenAddress,
                decimals: wrappedToken.decimals,
            },
        };
        return bufferState;
    }
}
