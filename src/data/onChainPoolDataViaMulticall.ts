import { PublicClient, formatUnits, parseAbi } from 'viem';
import { getPoolAddress } from '../utils';
import { vaultAbi } from '../abi';

const abi = parseAbi([
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
    'function getScalingFactors() view returns (uint256[] memory)', // do we need this here?
]);

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
    count: 7,
    build: (id: string, poolType: string) => [
        {
            address:
                '0xBA12222222228d8Ba445958a75a0704d566BF2C8' as `0x${string}`,
            abi: vaultAbi,
            functionName: 'getPoolTokens',
            args: [id],
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
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'inRecoveryMode',
        },
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getRate',
        },
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getScalingFactors',
        },
    ],
    parse: (results: any, shift: number) => ({
        balances: results[shift].result[1],
        totalSupply: results[shift + 1].result,
        swapFee: results[shift + 2].result,
        isPaused: results[shift + 3].result,
        inRecoveryMode: results[shift + 4].result,
        poolRate: results[shift + 5].result,
        scalingFactors: results[shift + 6].result,
        queryFailed: false,
    }),
};

const weightedCalls = {
    count: 1,
    build: (id: string) => [
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getNormalizedWeights',
        },
    ],
    parse: (results: any, shift: number) => ({
        weights: results[shift].result,
    }),
};

const linearCalls = {
    count: 2,
    build: (id: string) => [
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
    ],
    parse: (results: any, shift: number) => ({
        linearTargets: results[shift].result,
        wrappedTokenRate: results[shift + 1].result,
    }),
};

const stableCalls = {
    count: 1,
    build: (id: string) => [
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getAmplificationParameter',
        },
    ],
    parse: (results: any, shift: number) => ({
        amplificationParameter: formatUnits(
            results[shift].result[0],
            String(results[shift].result[2]).length - 1,
        ),
    }),
};

const gyroECalls = {
    count: 1,
    build: (id: string) => [
        {
            address: getPoolAddress(id) as `0x${string}`,
            abi,
            functionName: 'getTokenRates',
        },
    ],
    parse: (results: any, shift: number) => ({
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
        case 'Investment':
            return weightedCalls;
        case 'Stable':
        case 'StablePhantom':
        case 'MetaStable':
        case 'ComposableStable':
            return stableCalls;
        case 'GyroE':
            if (poolTypeVersion === 2) {
                return gyroECalls;
            } else {
                return do_nothing;
            }
        case 'AaveLinear':
            if (poolTypeVersion === 1) {
                return linearCalls;
            } else {
                return do_nothing;
            }
        default:
            return do_nothing;
    }
};

export const fetchAdditionalPoolData = async (
    pools: {
        id: string;
        poolType: string;
        poolTypeVersion: number;
    }[],
    client: PublicClient,
) => {
    if (pools.length === 0) {
        return [];
    }

    const contracts = pools.flatMap(({ id, poolType, poolTypeVersion }) => [
        ...defaultCalls.build(id, poolType),
        ...poolTypeCalls(poolType, poolTypeVersion).build(id),
    ]);

    const results = await client.multicall({
        contracts,
        batchSize: 128, // 128 is the max batch size for zkEVM RPCs
    });

    let shift = 0;

    return pools.map(({ id, poolType }) => {
        const result = {
            id,
            ...defaultCalls.parse(results, shift),
            ...poolTypeCalls(poolType).parse(
                results,
                shift + defaultCalls.count,
            ),
        };
        shift += defaultCalls.count + poolTypeCalls(poolType).count;
        return result;
    });
};
