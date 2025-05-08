import { ChainId } from '@/utils/constants';
import { balancerV3Contracts } from './balancerV3Contracts';

export const chainCapabilities = {
    [ChainId.BASE]: {
        supportsReClamm: true,
        supportsLBP: hasEntryInContractsV3('LBPoolFactory', ChainId.BASE),
        protocolVersion: 3,
    },
    [ChainId.SEPOLIA]: {
        supportsReClamm: true,
        supportsLBP: hasEntryInContractsV3('LBPoolFactory', ChainId.SEPOLIA),
        protocolVersion: 3,
    },
    [ChainId.OPTIMISM]: {
        supportsReClamm: false,
        supportsLBP: hasEntryInContractsV3('LBPoolFactory', ChainId.OPTIMISM),
        protocolVersion: 3,
    },
};

export function hasEntryInContractsV3(key: string, chainId: ChainId): boolean {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const contractEntries = (balancerV3Contracts as any)[key];
    if (!contractEntries) {
        return false;
    }

    return contractEntries[chainId];
}

export function isOperationSupported(
    chainId: ChainId,
    operation: 'createReClamm' | 'createLBP',
): boolean {
    const capabilities = chainCapabilities[chainId];
    if (!capabilities) {
        return false;
    }

    switch (operation) {
        case 'createReClamm':
            return capabilities.supportsReClamm ?? false;
        case 'createLBP':
            return capabilities.supportsLBP ?? false;
        default:
            return false;
    }
}
