import { balancerV3Contracts, balancerV2Contracts } from '@/utils';
import { SDKError } from '@/utils';
import { Hex } from '@/types';

import { ChainId } from '@/utils/constants';

/**
 * Validates if an address exists for the given key and chainId in the specified protocol version's contracts.
 * @param key - The key in balancerV3Contracts or balancerV2Contracts (e.g., "StableSurgePoolFactory").
 * @param chainId - The chainId to check for an entry.
 * @param version - The protocol version (2 for v2 contracts, 3 for v3 contracts).
 * @throws Error if the address does not exist in the specified protocol version's contracts.
 * @returns The address if it exists.
 */
export function validateAddressExists(
    key: string,
    chainId: ChainId,
    version: number,
): Hex {
    let address: string | undefined;

    if (version === 3) {
        // Check in balancerV3Contracts
        address = balancerV3Contracts[key]?.[chainId];
    } else if (version === 2) {
        // Check in balancerV2Contracts
        address = balancerV2Contracts[key]?.[chainId];
    } else {
        throw new SDKError(
            'InputValidator',
            'validateAddressExists',
            `Unsupported protocol version: ${version}`,
        );
    }

    if (!address) {
        throw new SDKError(
            'InputValidator',
            'validateAddressExists',
            `Address not found for ${key} on chainId: ${chainId} for protocol version: ${version}`,
        );
    }

    return address as Hex;
}
