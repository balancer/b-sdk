import { PublicClient, Address, Abi, Hex } from 'viem';
import { getPoolAddress } from '../utils';
import { OnChainPoolData } from './enrichers/onChainPoolDataEnricher';
import { SwapOptions } from '../types';

import * as abis from '../abi';

const requiredAbis = [
    ...abis.composabableStablePoolV5Abi,
    ...abis.fxPoolAbi,
    ...abis.gyroEV2Abi,
    ...abis.linearPoolAbi,
    ...abis.liquidityBootstrappingPoolAbi,
    ...abis.managedPoolAbi,
    ...abis.metaStablePoolAbi,
    ...abis.phantomStablePoolAbi,
    ...abis.stablePoolAbi,
    ...abis.weightedPoolAbi,
    ...abis.vaultAbi,
];

// remove duplicate abi elements
const uniqueAbiElements = new Map(
    requiredAbis.map((abi) => [JSON.stringify(abi), abi]),
);

// filters out non-function abi elements
const abi = Array.from(uniqueAbiElements.values()).filter(
    (a) => a.type === 'function',
) as Abi;

type Result =
    | {
          error: Error;
          result?: undefined;
          status: 'failure';
      }
    | {
          error?: undefined;
          result: any;
          status: 'success';
      };
[];

type Results = Result[];

// Extract the functionName property values into a union type
type FunctionNameUnion = (typeof abi)[number]['name'];

type BuildReturn = {
    address: Address;
    abi: Abi;
    functionName: FunctionNameUnion;
    args?: readonly [`0x${string}`];
};

const getTotalSupplyFn = (poolType: string) => {
    if (poolType.includes('Linear') || ['StablePhantom'].includes(poolType)) {
        return 'getVirtualSupply';
    }
    if (poolType === 'ComposableStable') {
        return 'getActualSupply';
    }
    return 'totalSupply';
};

const getSwapFeeFn = (poolType: string) => {
    if (poolType === 'Element') {
        return 'percentFee';
    }
    if (poolType === 'FX') {
        return 'protocolPercentFee';
    }
    return 'getSwapFeePercentage';
};

const defaultCalls = {
    count: 4,
    build: (id: string, poolType: string, vault: Address): BuildReturn[] => [
        {
            address: vault,
            abi,
            functionName: 'getPoolTokens',
            args: [id as Hex],
        },
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: getTotalSupplyFn(poolType),
        },
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: getSwapFeeFn(poolType),
        },
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getPausedState',
        },
    ],
    parse: (results: Results, shift: number) => {
        return {
            balances: results[shift].result[1],
            totalSupply: results[shift + 1].result,
            swapFee: results[shift + 2].result,
            isPaused: results[shift + 3].result,
        };
    },
};

// These don't exist on some earlier pool versions
const defaultCallsAux = {
    count: 2 + defaultCalls.count,
    build: (id: string, poolType: string, vault: Address): BuildReturn[] => [
        ...defaultCalls.build(id, poolType, vault),
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'inRecoveryMode',
        },
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getScalingFactors',
        },
    ],
    parse: (results: Results, shift: number) => ({
        ...defaultCalls.parse(results, shift),
        ...{
            inRecoveryMode: results[shift + defaultCalls.count].result,
            scalingFactors: results[shift + defaultCalls.count + +1].result,
        },
    }),
};

const weightedCalls = {
    count: 1,
    build: (id: string): BuildReturn[] => [
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getNormalizedWeights',
        },
    ],
    parse: (results: Results, shift: number) => ({
        weights: results[shift].result,
    }),
};

const linearCalls = {
    count: 3,
    build: (id: string): BuildReturn[] => [
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getTargets',
        },
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getWrappedTokenRate',
        },
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getRate',
        },
    ],
    parse: (results: Results, shift: number) => ({
        linearTargets: results[shift].result,
        wrappedTokenRate: results[shift + 1].result,
        poolRate: results[shift + 2].result,
    }),
};

const stableCalls = {
    count: 1,
    build: (id: string): BuildReturn[] => [
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getAmplificationParameter',
        },
    ],
    parse: (results: Results, shift: number) => {
        return {
            amp: results[shift].result[0],
        };
    },
};

const gyroECalls = {
    count: 1,
    build: (id: string): BuildReturn[] => [
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getTokenRates',
        },
    ],
    parse: (results: Results, shift: number) => ({
        tokenRates: results[shift].result,
    }),
};

const poolTypeCalls = (
    poolType: string,
    poolTypeVersion: number,
    vault: Address,
) => {
    const do_nothing = {
        count: 0,
        build: () => [],
        parse: () => ({}),
    };

    switch (poolType) {
        case 'Weighted':
        case 'LiquidityBootstrapping':
        case 'Investment': {
            if (poolTypeVersion === 1) {
                return {
                    count: defaultCalls.count + weightedCalls.count,
                    build: (id: string) => [
                        ...defaultCalls.build(id, poolType, vault),
                        ...weightedCalls.build(id),
                    ],
                    parse: (results: Results, shift: number) => ({
                        ...defaultCalls.parse(results, shift),
                        ...weightedCalls.parse(
                            results,
                            shift + defaultCalls.count,
                        ),
                    }),
                };
            }
            return {
                count: defaultCallsAux.count + weightedCalls.count,
                build: (id: string) => [
                    ...defaultCallsAux.build(id, poolType, vault),
                    ...weightedCalls.build(id),
                ],
                parse: (results: Results, shift: number) => ({
                    ...defaultCallsAux.parse(results, shift),
                    ...weightedCalls.parse(
                        results,
                        shift + defaultCallsAux.count,
                    ),
                }),
            };
        }
        case 'Stable': {
            if (poolTypeVersion === 1) {
                return {
                    count: defaultCalls.count + stableCalls.count,
                    build: (id: string) => [
                        ...defaultCalls.build(id, poolType, vault),
                        ...stableCalls.build(id),
                    ],
                    parse: (results: Results, shift: number) => ({
                        ...defaultCalls.parse(results, shift),
                        ...stableCalls.parse(
                            results,
                            shift + defaultCalls.count,
                        ),
                    }),
                };
            }
            return {
                count: defaultCallsAux.count + stableCalls.count,
                build: (id: string) => [
                    ...defaultCallsAux.build(id, poolType, vault),
                    ...stableCalls.build(id),
                ],
                parse: (results: Results, shift: number) => ({
                    ...defaultCallsAux.parse(results, shift),
                    ...stableCalls.parse(
                        results,
                        shift + defaultCallsAux.count,
                    ),
                }),
            };
        }
        case 'StablePhantom':
        case 'MetaStable':
            return {
                count: defaultCalls.count + stableCalls.count,
                build: (id: string) => [
                    ...defaultCalls.build(id, poolType, vault),
                    ...stableCalls.build(id),
                ],
                parse: (results: Results, shift: number) => ({
                    ...defaultCalls.parse(results, shift),
                    ...stableCalls.parse(results, shift + defaultCalls.count),
                }),
            };
        case 'ComposableStable': {
            return {
                count: defaultCallsAux.count + stableCalls.count,
                build: (id: string) => [
                    ...defaultCallsAux.build(id, poolType, vault),
                    ...stableCalls.build(id),
                ],
                parse: (results: Results, shift: number) => ({
                    ...defaultCallsAux.parse(results, shift),
                    ...stableCalls.parse(
                        results,
                        shift + defaultCallsAux.count,
                    ),
                }),
            };
        }
        case 'GyroE':
            if (poolTypeVersion === 1) {
                return defaultCalls;
            }
            return {
                count: defaultCalls.count + gyroECalls.count,
                build: (id: string) => [
                    ...defaultCalls.build(id, poolType, vault),
                    ...gyroECalls.build(id),
                ],
                parse: (results: Results, shift: number) => ({
                    ...defaultCalls.parse(results, shift),
                    ...gyroECalls.parse(results, shift + defaultCalls.count),
                }),
            };

        case 'AaveLinear':
            if (poolTypeVersion === 1) {
                return {
                    count: defaultCalls.count + linearCalls.count,
                    build: (id: string) => [
                        ...defaultCalls.build(id, poolType, vault),
                        ...linearCalls.build(id),
                    ],
                    parse: (results: Results, shift: number) => ({
                        ...defaultCalls.parse(results, shift),
                        ...linearCalls.parse(
                            results,
                            shift + defaultCalls.count,
                        ),
                    }),
                };
            }
            return defaultCallsAux;
        default:
            return do_nothing;
    }
};

export const fetchAdditionalPoolData = async (
    vault: Address,
    pools: {
        id: string;
        poolType: string;
        poolTypeVersion: number;
    }[],
    client: PublicClient,
    options: SwapOptions,
    batchSize: number,
): Promise<OnChainPoolData[]> => {
    if (pools.length === 0) {
        return [];
    }

    const calls = pools.flatMap(({ id, poolType, poolTypeVersion }) =>
        poolTypeCalls(poolType, poolTypeVersion, vault).build(
            id,
            poolType,
            vault,
        ),
    );

    const results = await client.multicall({
        contracts: calls,
        batchSize: batchSize,
        blockNumber: options.block,
    });

    results.forEach((r, i) => {
        if (r.status === 'failure')
            console.error(
                'Failed request in multicall',
                calls[i].address,
                calls[i].functionName,
                r.error,
            );
    });

    let shift = 0;

    return pools.map(({ id, poolType, poolTypeVersion }) => {
        const result = {
            id,
            ...poolTypeCalls(poolType, poolTypeVersion, vault).parse(
                results,
                shift,
            ),
        } as OnChainPoolData;
        shift += poolTypeCalls(poolType, poolTypeVersion, vault).count;
        return result;
    });
};
