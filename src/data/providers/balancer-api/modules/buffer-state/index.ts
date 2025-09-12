import { BalancerApiClient } from '../../client';
import { API_CHAIN_NAMES } from '../../../../../utils/constants';
import { BufferState } from '@/entities';
import { Address } from 'viem';
import { inputValidationError } from '@/utils';
import { gql } from 'graphql-tag';
import { DocumentNode, print } from 'graphql';
import { tokenGetTokensQuery } from '../../generated/types';

export class Buffers {
    readonly bufferStateQuery: DocumentNode = gql`
      query tokenGetTokens($wrappedTokenAddress: String!, $chain: GqlChain!) {
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
            query: print(this.bufferStateQuery),
            variables: {
                wrappedTokenAddress: wrappedTokenAddress.toLowerCase(),
                // the API requires chain names to be sent as uppercase strings
                chain: API_CHAIN_NAMES[this.balancerApiClient.chainId],
            },
        });
        
        // Now data is fully typed as tokenGetTokensQuery
        const apiResponse: tokenGetTokensQuery = data;
        const tokens = apiResponse.tokenGetTokens;
        
        if (!tokens || tokens.length === 0) {
            throw inputValidationError(
                'Fetch Buffer State',
                `No token found for address ${wrappedTokenAddress}`,
            );
        }
        
        const wrappedToken = tokens[0];
        if (!wrappedToken.isErc4626) {
            throw inputValidationError(
                'Fetch Buffer State',
                `wrappedTokenAddress ${wrappedTokenAddress} provided is not an ERC4626`,
            );
        }
        
        const bufferState: BufferState = {
            wrappedToken: {
                address: wrappedToken.address as Address,
                decimals: wrappedToken.decimals,
            },
            underlyingToken: {
                address: wrappedToken.underlyingTokenAddress as Address,
                decimals: wrappedToken.decimals,
            },
        };
        return bufferState;
    }
}
