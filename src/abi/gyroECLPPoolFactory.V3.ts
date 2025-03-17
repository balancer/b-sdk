export const gyroECLPPoolFactoryAbi_V3 = [
    {
        inputs: [
            {
                internalType: 'contract IVault',
                name: 'vault',
                type: 'address',
            },
            {
                internalType: 'uint32',
                name: 'pauseWindowDuration',
                type: 'uint32',
            },
            {
                internalType: 'string',
                name: 'factoryVersion',
                type: 'string',
            },
            {
                internalType: 'string',
                name: 'poolVersion',
                type: 'string',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [],
        name: 'CodeDeploymentFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'Create2EmptyBytecode',
        type: 'error',
    },
    {
        inputs: [],
        name: 'Create2FailedDeployment',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'balance',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'needed',
                type: 'uint256',
            },
        ],
        name: 'Create2InsufficientBalance',
        type: 'error',
    },
    {
        inputs: [],
        name: 'Disabled',
        type: 'error',
    },
    {
        inputs: [],
        name: 'IndexOutOfBounds',
        type: 'error',
    },
    {
        inputs: [],
        name: 'PoolPauseWindowDurationOverflow',
        type: 'error',
    },
    {
        inputs: [],
        name: 'SenderNotAllowed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'StandardPoolWithCreator',
        type: 'error',
    },
    {
        inputs: [],
        name: 'SupportsOnlyTwoTokens',
        type: 'error',
    },
    {
        anonymous: false,
        inputs: [],
        name: 'FactoryDisabled',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolCreated',
        type: 'event',
    },
    {
        inputs: [
            {
                internalType: 'string',
                name: 'name',
                type: 'string',
            },
            {
                internalType: 'string',
                name: 'symbol',
                type: 'string',
            },
            {
                components: [
                    {
                        internalType: 'contract IERC20',
                        name: 'token',
                        type: 'address',
                    },
                    {
                        internalType: 'enum TokenType',
                        name: 'tokenType',
                        type: 'uint8',
                    },
                    {
                        internalType: 'contract IRateProvider',
                        name: 'rateProvider',
                        type: 'address',
                    },
                    {
                        internalType: 'bool',
                        name: 'paysYieldFees',
                        type: 'bool',
                    },
                ],
                internalType: 'struct TokenConfig[]',
                name: 'tokens',
                type: 'tuple[]',
            },
            {
                components: [
                    {
                        internalType: 'int256',
                        name: 'alpha',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'beta',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'c',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 's',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'lambda',
                        type: 'int256',
                    },
                ],
                internalType: 'struct IGyroECLPPool.EclpParams',
                name: 'eclpParams',
                type: 'tuple',
            },
            {
                components: [
                    {
                        components: [
                            {
                                internalType: 'int256',
                                name: 'x',
                                type: 'int256',
                            },
                            {
                                internalType: 'int256',
                                name: 'y',
                                type: 'int256',
                            },
                        ],
                        internalType: 'struct IGyroECLPPool.Vector2',
                        name: 'tauAlpha',
                        type: 'tuple',
                    },
                    {
                        components: [
                            {
                                internalType: 'int256',
                                name: 'x',
                                type: 'int256',
                            },
                            {
                                internalType: 'int256',
                                name: 'y',
                                type: 'int256',
                            },
                        ],
                        internalType: 'struct IGyroECLPPool.Vector2',
                        name: 'tauBeta',
                        type: 'tuple',
                    },
                    {
                        internalType: 'int256',
                        name: 'u',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'v',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'w',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'z',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'dSq',
                        type: 'int256',
                    },
                ],
                internalType: 'struct IGyroECLPPool.DerivedEclpParams',
                name: 'derivedEclpParams',
                type: 'tuple',
            },
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'pauseManager',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'swapFeeManager',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'poolCreator',
                        type: 'address',
                    },
                ],
                internalType: 'struct PoolRoleAccounts',
                name: 'roleAccounts',
                type: 'tuple',
            },
            {
                internalType: 'uint256',
                name: 'swapFeePercentage',
                type: 'uint256',
            },
            {
                internalType: 'address',
                name: 'poolHooksContract',
                type: 'address',
            },
            {
                internalType: 'bool',
                name: 'enableDonation',
                type: 'bool',
            },
            {
                internalType: 'bool',
                name: 'disableUnbalancedLiquidity',
                type: 'bool',
            },
            {
                internalType: 'bytes32',
                name: 'salt',
                type: 'bytes32',
            },
        ],
        name: 'create',
        outputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'disable',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes4',
                name: 'selector',
                type: 'bytes4',
            },
        ],
        name: 'getActionId',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getAuthorizer',
        outputs: [
            {
                internalType: 'contract IAuthorizer',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getCreationCode',
        outputs: [
            {
                internalType: 'bytes',
                name: '',
                type: 'bytes',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getCreationCodeContracts',
        outputs: [
            {
                internalType: 'address',
                name: 'contractA',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'contractB',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getDefaultLiquidityManagement',
        outputs: [
            {
                components: [
                    {
                        internalType: 'bool',
                        name: 'disableUnbalancedLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'enableAddLiquidityCustom',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'enableRemoveLiquidityCustom',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'enableDonation',
                        type: 'bool',
                    },
                ],
                internalType: 'struct LiquidityManagement',
                name: 'liquidityManagement',
                type: 'tuple',
            },
        ],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getDefaultPoolHooksContract',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes',
                name: 'constructorArgs',
                type: 'bytes',
            },
            {
                internalType: 'bytes32',
                name: 'salt',
                type: 'bytes32',
            },
        ],
        name: 'getDeploymentAddress',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getNewPoolPauseWindowEndTime',
        outputs: [
            {
                internalType: 'uint32',
                name: '',
                type: 'uint32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getOriginalPauseWindowEndTime',
        outputs: [
            {
                internalType: 'uint32',
                name: '',
                type: 'uint32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getPauseWindowDuration',
        outputs: [
            {
                internalType: 'uint32',
                name: '',
                type: 'uint32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getPoolCount',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getPoolVersion',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getPools',
        outputs: [
            {
                internalType: 'address[]',
                name: '',
                type: 'address[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'start',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'count',
                type: 'uint256',
            },
        ],
        name: 'getPoolsInRange',
        outputs: [
            {
                internalType: 'address[]',
                name: 'pools',
                type: 'address[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getVault',
        outputs: [
            {
                internalType: 'contract IVault',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'isDisabled',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'isPoolFromFactory',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'version',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;
