export const lBPoolFactoryAbi = [
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
            {
                internalType: 'address',
                name: 'trustedRouter',
                type: 'address',
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
        inputs: [
            {
                internalType: 'uint256',
                name: 'resolvedStartTime',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
            },
        ],
        name: 'GradualUpdateTimeTravel',
        type: 'error',
    },
    {
        inputs: [],
        name: 'IndexOutOfBounds',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidOwner',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidTrustedRouter',
        type: 'error',
    },
    {
        inputs: [],
        name: 'MinWeight',
        type: 'error',
    },
    {
        inputs: [],
        name: 'NormalizedWeightInvariant',
        type: 'error',
    },
    {
        inputs: [],
        name: 'PoolPauseWindowDurationOverflow',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ReentrancyGuardReentrantCall',
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
            {
                indexed: true,
                internalType: 'contract IERC20',
                name: 'projectToken',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'contract IERC20',
                name: 'reserveToken',
                type: 'address',
            },
        ],
        name: 'LBPoolCreated',
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
                        internalType: 'address',
                        name: 'owner',
                        type: 'address',
                    },
                    {
                        internalType: 'contract IERC20',
                        name: 'projectToken',
                        type: 'address',
                    },
                    {
                        internalType: 'contract IERC20',
                        name: 'reserveToken',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'projectTokenStartWeight',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'reserveTokenStartWeight',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'projectTokenEndWeight',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'reserveTokenEndWeight',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'startTime',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'endTime',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bool',
                        name: 'blockProjectTokenSwapsIn',
                        type: 'bool',
                    },
                ],
                internalType: 'struct LBPParams',
                name: 'lbpParams',
                type: 'tuple',
            },
            {
                internalType: 'uint256',
                name: 'swapFeePercentage',
                type: 'uint256',
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
        name: 'getTrustedRouter',
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
