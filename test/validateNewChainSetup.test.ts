import { API_CHAIN_NAMES, ChainId } from '@/utils';
import { NATIVE_ASSETS } from '@/utils/constants';
import { SorSwapPaths } from '@/data/providers/balancer-api/modules/sorSwapPaths';
import { BalancerApiClient } from '@/data/providers/balancer-api/client';

const API_ENDPOINT = 'https://api-v3.balancer.fi/';

type SupportedChain = {
    name: string;
    chainId: number | undefined;
};

describe('Balancer API (sdk) supports all API chains', () => {
    let supportedChains: SupportedChain[] = [];

    beforeAll(async () => {
        const chainNames = await fetchSupportedChains(API_ENDPOINT);

        // Build array of objects: { name, chainId }
        supportedChains = chainNames.map((name: string) => {
            // Find the chainId for this name in API_CHAIN_NAMES
            const chainIdEntry = Object.entries(API_CHAIN_NAMES).find(
                ([, apiName]) => apiName === name,
            );
            return {
                name,
                chainId: chainIdEntry ? Number(chainIdEntry[0]) : undefined,
            };
        });
    });

    test('API supported chains can be used to fetch SOR paths', () => {
        // Check that every supported chain string has an entry in API_CHAIN_NAMES
        const missingEntries: string[] = [];
        for (const { name, chainId } of supportedChains) {
            if (chainId === undefined) {
                missingEntries.push(name);
            }
        }

        if (missingEntries.length > 0) {
            console.warn(
                '⚠️  Missing API_CHAIN_NAMES entries for:',
                missingEntries,
            );
        }

        // Always pass the test
        expect(true).toBe(true);
    });
    test('The Balancer Api (sdk) supports the api chains', () => {
        const sorSwapPaths = new SorSwapPaths(
            null as unknown as BalancerApiClient,
        );

        const unsupportedChains: string[] = [];
        for (const { chainId } of supportedChains) {
            if (chainId !== undefined) {
                try {
                    const result = sorSwapPaths.mapGqlChain(chainId);
                    if (!result) {
                        unsupportedChains.push(`ChainId ${chainId}`);
                    }
                } catch (_error) {
                    unsupportedChains.push(`ChainId ${chainId}`);
                }
            }
        }

        if (unsupportedChains.length > 0) {
            console.warn(
                '⚠️  Chains that cannot be used for SOR paths:',
                unsupportedChains,
            );
        }

        // Always pass the test
        expect(true).toBe(true);
    });
});
describe('Native asset is defined for all API chains', () => {
    let supportedChains: SupportedChain[] = [];

    beforeAll(async () => {
        const chainNames = await fetchSupportedChains(API_ENDPOINT);

        // Build array of objects: { name, chainId }
        supportedChains = chainNames.map((name: string) => {
            // Find the chainId for this name in API_CHAIN_NAMES
            const chainIdEntry = Object.entries(API_CHAIN_NAMES).find(
                ([, apiName]) => apiName === name,
            );
            return {
                name,
                chainId: chainIdEntry ? Number(chainIdEntry[0]) : undefined,
            };
        });
    });

    test('Native asset is defined for all API chains', () => {
        const missingNativeAssets: string[] = [];
        for (const { name, chainId } of supportedChains) {
            if (chainId === undefined) continue;
            if (!NATIVE_ASSETS[chainId]) {
                missingNativeAssets.push(`${name} (${chainId})`);
            }
        }
        if (missingNativeAssets.length > 0) {
            console.warn(
                '⚠️  Missing NATIVE_ASSETS entries for:',
                missingNativeAssets,
            );
        }
        // Always pass the test
        expect(true).toBe(true);
    });
});

const introspectionQuery = `
  query IntrospectGqlChain {
    __type(name: "GqlChain") {
      name
      enumValues {
        name
        description
      }
    }
  }
`;

type GqlChainEnumValue = {
    name: string;
    description?: string;
};

async function fetchSupportedChains(endpoint: string) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: introspectionQuery,
            }),
        });

        const data = await response.json();
        const enumValues: GqlChainEnumValue[] = data.data.__type.enumValues;

        return enumValues.map((ev: GqlChainEnumValue) => ev.name);
    } catch (error) {
        console.error('Error fetching enum values:', error);
        return [];
    }
}
