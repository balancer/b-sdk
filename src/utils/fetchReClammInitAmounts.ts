import { type InputAmount } from '@/types';
import { type PoolState } from '@/entities';
import { type Address, parseAbi } from 'viem';
import { PublicWalletClient } from '@/utils';

export type FetchReClammInitAmountsInput = {
    client: PublicWalletClient;
    poolState: PoolState;
    referenceToken: Address;
    referenceAmountIn: bigint;
};

export async function fetchReClammInitAmounts({
    client,
    poolState,
    referenceToken,
    referenceAmountIn,
}: FetchReClammInitAmountsInput): Promise<InputAmount[]> {
    // Initial balances read on chain so in proper sorted order
    const initialBalances = await client.readContract({
        address: poolState.address,
        abi: parseAbi([
            'function computeInitialBalances(address referenceToken, uint256 referenceAmountIn) view returns (uint256[])',
        ]),
        functionName: 'computeInitialBalances',
        args: [referenceToken, referenceAmountIn],
    });

    // Pool state also read on chain so in matching proper sorted order
    return poolState.tokens.map((token, index) => ({
        address: token.address,
        rawAmount: initialBalances[index],
        decimals: token.decimals,
    }));
}
