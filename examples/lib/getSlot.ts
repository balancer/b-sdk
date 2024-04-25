import { ChainId } from '@/utils';
import { TOKENS } from 'test/lib/utils';
import { Address } from 'viem';

/**
 * Slot refers to the storage slot responsible for token balance within an ERC20 contract. It is used to artificially manipulate account balance before any tests/examples on local forks.
 * Can be found using: https://www.npmjs.com/package/slot20
 * @param chainId
 * @param tokenAddress
 * @returns
 */
export function getSlot(chainId: ChainId, tokenAddress: Address): number {
    const tokens = Object.values(TOKENS[chainId]);
    const token = tokens.find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
    );
    if (!token)
        throw new Error(
            `TOKENS does not contain token ${tokenAddress} ${chainId}`,
        );
    if (token.slot === undefined)
        throw new Error(
            `TOKENS does not contain slot for token ${tokenAddress} ${chainId}`,
        );
    return token.slot;
}
