export const balancerPoolDataQueriesAbi = [
    {
        inputs: [
            {
                internalType: 'contract IVault',
                name: '_vault',
                type: 'address',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'poolAddresses',
                type: 'address[]',
            },
        ],
        name: 'getAmpForPools',
        outputs: [
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'poolAddresses',
                type: 'address[]',
            },
        ],
        name: 'getInRecoveryModeForPools',
        outputs: [
            {
                internalType: 'bool[]',
                name: '',
                type: 'bool[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'poolAddresses',
                type: 'address[]',
            },
        ],
        name: 'getIsPausedForPools',
        outputs: [
            {
                internalType: 'bool[]',
                name: '',
                type: 'bool[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'poolAddresses',
                type: 'address[]',
            },
        ],
        name: 'getLinearTargetsForPools',
        outputs: [
            {
                internalType: 'uint256[][]',
                name: '',
                type: 'uint256[][]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'poolAddresses',
                type: 'address[]',
            },
        ],
        name: 'getNormalizedWeightsForPools',
        outputs: [
            { internalType: 'uint256[][]', name: '', type: 'uint256[][]' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'bytes32[]', name: 'poolIds', type: 'bytes32[]' },
            {
                components: [
                    {
                        internalType: 'bool',
                        name: 'loadTokenBalanceUpdatesAfterBlock',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'loadTotalSupply',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'loadSwapFees',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'loadLinearWrappedTokenRates',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'loadLinearTargets',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'loadNormalizedWeights',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'loadScalingFactors',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'loadAmps',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'loadRates',
                        type: 'bool',
                    },
                    {
                        internalType: 'uint256',
                        name: 'blockNumber',
                        type: 'uint256',
                    },
                    {
                        internalType: 'enum TotalSupplyType[]',
                        name: 'totalSupplyTypes',
                        type: 'uint8[]',
                    },
                    {
                        internalType: 'enum SwapFeeType[]',
                        name: 'swapFeeTypes',
                        type: 'uint8[]',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'linearPoolIdxs',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'weightedPoolIdxs',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'scalingFactorPoolIdxs',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'ampPoolIdxs',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'ratePoolIdxs',
                        type: 'uint256[]',
                    },
                ],
                internalType: 'struct PoolDataQueryConfig',
                name: 'config',
                type: 'tuple',
            },
        ],
        name: 'getPoolData',
        outputs: [
            {
                internalType: 'uint256[][]',
                name: 'balances',
                type: 'uint256[][]',
            },
            {
                internalType: 'uint256[]',
                name: 'totalSupplies',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'swapFees',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'linearWrappedTokenRates',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[][]',
                name: 'linearTargets',
                type: 'uint256[][]',
            },
            {
                internalType: 'uint256[][]',
                name: 'weights',
                type: 'uint256[][]',
            },
            {
                internalType: 'uint256[][]',
                name: 'scalingFactors',
                type: 'uint256[][]',
            },
            {
                internalType: 'uint256[]',
                name: 'amps',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'rates',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'ignoreIdxs',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32[]',
                name: 'poolIds',
                type: 'bytes32[]',
            },
            {
                components: [
                    {
                        internalType: 'bool',
                        name: 'loadInRecoveryMode',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'loadIsPaused',
                        type: 'bool',
                    },
                ],
                internalType: 'struct PoolStatusQueryConfig',
                name: 'config',
                type: 'tuple',
            },
        ],
        name: 'getPoolStatus',
        outputs: [
            {
                internalType: 'bool[]',
                name: 'isPaused',
                type: 'bool[]',
            },
            {
                internalType: 'bool[]',
                name: 'inRecoveryMode',
                type: 'bool[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32[]',
                name: 'poolIds',
                type: 'bytes32[]',
            },
            {
                internalType: 'uint256',
                name: 'blockNumber',
                type: 'uint256',
            },
        ],
        name: 'getPoolTokenBalancesWithUpdatesAfterBlock',
        outputs: [
            {
                internalType: 'uint256[][]',
                name: '',
                type: 'uint256[][]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'poolAddresses',
                type: 'address[]',
            },
        ],
        name: 'getRateForPools',
        outputs: [
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'poolAddresses',
                type: 'address[]',
            },
        ],
        name: 'getScalingFactorsForPools',
        outputs: [
            { internalType: 'uint256[][]', name: '', type: 'uint256[][]' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'poolAddresses',
                type: 'address[]',
            },
            {
                internalType: 'enum SwapFeeType[]',
                name: 'swapFeeTypes',
                type: 'uint8[]',
            },
        ],
        name: 'getSwapFeePercentageForPools',
        outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'poolAddresses',
                type: 'address[]',
            },
            {
                internalType: 'enum TotalSupplyType[]',
                name: 'totalSupplyTypes',
                type: 'uint8[]',
            },
        ],
        name: 'getTotalSupplyForPools',
        outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'poolAddresses',
                type: 'address[]',
            },
        ],
        name: 'getWrappedTokenRateForLinearPools',
        outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'vault',
        outputs: [
            { internalType: 'contract IVault', name: '', type: 'address' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;
