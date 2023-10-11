import {
    PublicClient,
    parseAbi,
    multicall3Abi,
    encodeFunctionData,
    Address,
    Abi,
    Hex,
    decodeFunctionResult,
} from 'viem';
import { getPoolAddress } from '../utils';
import { OnChainPoolData } from './enrichers/onChainPoolDataEnricher';
import { SwapOptions } from '../types';

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

const abi = parseAbi([
    'function getPoolTokens(bytes32 poolId) view returns (address[] tokens, uint256 lastChangeBlock)',
    'function getSwapFeePercentage() view returns (uint256)',
    'function percentFee() view returns (uint256)',
    'function protocolPercentFee() view returns (uint256)',
    'function getNormalizedWeights() view returns (uint256[])',
    'function totalSupply() view returns (uint256)',
    'function getVirtualSupply() view returns (uint256)',
    'function getActualSupply() view returns (uint256)',
    'function getTargets() view returns (uint256 lowerTarget, uint256 upperTarget)',
    'function getTokenRates() view returns (uint256, uint256)',
    'function getWrappedTokenRate() view returns (uint256)',
    'function getAmplificationParameter() view returns (uint256 value, bool isUpdating, uint256 precision)',
    'function getPausedState() view returns (bool)',
    'function inRecoveryMode() view returns (bool)',
    'function getRate() view returns (uint256)',
    'function getScalingFactors() view returns (uint256[] memory)',
]);

// Extract the functionName property values into a union type
type FunctionNameUnion = typeof abi[number]['name'];

type BuildReturn = {
    address: Address;
    abi: Abi;
    functionName: FunctionNameUnion;
    args?: readonly [`0x${string}`];
};

const getTotalSupplyFn = (poolType: string) => {
    if (poolType.includes('Linear') || ['StablePhantom'].includes(poolType)) {
        return 'getVirtualSupply';
    } else if (poolType === 'ComposableStable') {
        return 'getActualSupply';
    } else {
        return 'totalSupply';
    }
};

const getSwapFeeFn = (poolType: string) => {
    if (poolType === 'Element') {
        return 'percentFee';
    } else if (poolType === 'FX') {
        return 'protocolPercentFee';
    } else {
        return 'getSwapFeePercentage';
    }
};

const defaultCalls = {
    count: 4,
    build: (id: string, poolType: string): BuildReturn[] => [
        {
            address:
                '0xBA12222222228d8Ba445958a75a0704d566BF2C8' as `0x${string}`,
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
    build: (id: string, poolType: string): BuildReturn[] => [
        ...defaultCalls.build(id, poolType),
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

const poolTypeCalls = (poolType: string, poolTypeVersion = 1) => {
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
                        ...defaultCalls.build(id, poolType),
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
            } else
                return {
                    count: defaultCallsAux.count + weightedCalls.count,
                    build: (id: string) => [
                        ...defaultCallsAux.build(id, poolType),
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
                        ...defaultCalls.build(id, poolType),
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
            } else {
                return {
                    count: defaultCallsAux.count + stableCalls.count,
                    build: (id: string) => [
                        ...defaultCallsAux.build(id, poolType),
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
        }
        case 'StablePhantom':
        case 'MetaStable':
            return {
                count: defaultCalls.count + stableCalls.count,
                build: (id: string) => [
                    ...defaultCalls.build(id, poolType),
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
                    ...defaultCallsAux.build(id, poolType),
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
            if (poolTypeVersion === 2) {
                return {
                    count: defaultCalls.count + gyroECalls.count,
                    build: (id: string) => [
                        ...defaultCalls.build(id, poolType),
                        ...gyroECalls.build(id),
                    ],
                    parse: (results: Results, shift: number) => ({
                        ...defaultCalls.parse(results, shift),
                        ...gyroECalls.parse(
                            results,
                            shift + defaultCalls.count,
                        ),
                    }),
                };
            } else {
                return defaultCalls;
            }
        case 'AaveLinear':
            if (poolTypeVersion === 1) {
                return {
                    count: defaultCalls.count + linearCalls.count,
                    build: (id: string) => [
                        ...defaultCalls.build(id, poolType),
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
            } else {
                return defaultCallsAux;
            }
        default:
            return do_nothing;
    }
};

export const fetchAdditionalPoolData = async (
    multicallAddress: Address,
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
        poolTypeCalls(poolType, poolTypeVersion).build(id, poolType),
    );

    const batchedCalls = calls.map(({ address, functionName, args }) => {
        let callData;
        if (args !== undefined)
            callData = encodeFunctionData({ abi, functionName, args });
        else callData = encodeFunctionData({ abi, functionName });
        return {
            target: address,
            allowFailure: true,
            callData,
        };
    });

    const numBatches = Math.ceil(batchedCalls.length / batchSize);
    const batchPromises: Promise<
        readonly {
            success: boolean;
            returnData: `0x${string}`;
        }[]
    >[] = [];

    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
        const batchCalls = batchedCalls.slice(
            batchIndex * batchSize,
            (batchIndex + 1) * batchSize,
        );

        batchPromises.push(
            client.readContract({
                address: multicallAddress,
                abi: multicall3Abi,
                functionName: 'aggregate3',
                blockNumber: options.block,
                args: [batchCalls],
            }),
        );
    }

    const encodedResults = (await Promise.all(batchPromises)).flatMap((r) => r);

    const results = encodedResults.map((result, i) => {
        if (result.success) {
            const decodedResult = decodeFunctionResult({
                abi,
                functionName: calls[i].functionName,
                data: result.returnData,
            });
            return {
                error: undefined,
                result: decodedResult,
                status: 'success',
            } as Result;
        } else {
            console.error(
                'Failed request in multicall',
                calls[i].address,
                calls[i].functionName,
            );
            return {
                error: new Error('failed'),
                result: undefined,
                status: 'failure',
            } as Result;
        }
    });

    let shift = 0;

    return pools.map(({ id, poolType, poolTypeVersion }) => {
        const result = {
            id,
            ...poolTypeCalls(poolType, poolTypeVersion).parse(results, shift),
        } as OnChainPoolData;
        shift += poolTypeCalls(poolType, poolTypeVersion).count;
        return result;
    });
};
