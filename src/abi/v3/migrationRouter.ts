export const migrationRouter_V3 = [
    {
        inputs: [
            {
                internalType: 'contract BalancerContractRegistry',
                name: 'contractRegistry',
                type: 'address',
            },
            { internalType: 'string', name: 'version', type: 'string' },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [{ internalType: 'address', name: 'target', type: 'address' }],
        name: 'AddressEmptyCode',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'unlockTimestamp',
                type: 'uint256',
            },
        ],
        name: 'BPTStillLocked',
        type: 'error',
    },
    {
        inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'allowance', type: 'uint256' },
            { internalType: 'uint256', name: 'needed', type: 'uint256' },
            { internalType: 'uint256', name: 'id', type: 'uint256' },
        ],
        name: 'ERC6909InsufficientAllowance',
        type: 'error',
    },
    {
        inputs: [
            { internalType: 'address', name: 'sender', type: 'address' },
            { internalType: 'uint256', name: 'balance', type: 'uint256' },
            { internalType: 'uint256', name: 'needed', type: 'uint256' },
            { internalType: 'uint256', name: 'id', type: 'uint256' },
        ],
        name: 'ERC6909InsufficientBalance',
        type: 'error',
    },
    {
        inputs: [
            { internalType: 'address', name: 'approver', type: 'address' },
        ],
        name: 'ERC6909InvalidApprover',
        type: 'error',
    },
    {
        inputs: [
            { internalType: 'address', name: 'receiver', type: 'address' },
        ],
        name: 'ERC6909InvalidReceiver',
        type: 'error',
    },
    {
        inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
        name: 'ERC6909InvalidSender',
        type: 'error',
    },
    {
        inputs: [{ internalType: 'address', name: 'spender', type: 'address' }],
        name: 'ERC6909InvalidSpender',
        type: 'error',
    },
    { inputs: [], name: 'FailedCall', type: 'error' },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'expectedRouter',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'actualRouter',
                type: 'address',
            },
        ],
        name: 'IncorrectMigrationRouter',
        type: 'error',
    },
    { inputs: [], name: 'NoLockedBPT', type: 'error' },
    { inputs: [], name: 'NoRegisteredWeightedPoolFactory', type: 'error' },
    { inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
    {
        inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
        name: 'SafeERC20FailedOperation',
        type: 'error',
    },
    { inputs: [], name: 'SenderIsNotLBPOwner', type: 'error' },
    {
        inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
        name: 'SenderIsNotVault',
        type: 'error',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'id',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'Approval',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'contract IERC20',
                name: 'bptAddress',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'unlockTimestamp',
                type: 'uint256',
            },
        ],
        name: 'BPTTimelockSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'uint256',
                name: 'id',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'uint8',
                name: 'newDecimals',
                type: 'uint8',
            },
        ],
        name: 'ERC6909DecimalsUpdated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'uint256',
                name: 'id',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'string',
                name: 'newName',
                type: 'string',
            },
        ],
        name: 'ERC6909NameUpdated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'uint256',
                name: 'id',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'string',
                name: 'newSymbol',
                type: 'string',
            },
        ],
        name: 'ERC6909SymbolUpdated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'bool',
                name: 'approved',
                type: 'bool',
            },
        ],
        name: 'OperatorSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'contract ILBPool',
                name: 'lbp',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'contract IWeightedPool',
                name: 'weightedPool',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256[]',
                name: 'exactAmountsIn',
                type: 'uint256[]',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'bptAmountOut',
                type: 'uint256',
            },
        ],
        name: 'PoolMigrated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'caller',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'receiver',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'id',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'Transfer',
        type: 'event',
    },
    {
        inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'id', type: 'uint256' },
        ],
        name: 'allowance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'id', type: 'uint256' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'uint256', name: 'id', type: 'uint256' },
        ],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
        name: 'decimals',
        outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
        name: 'getId',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
        name: 'getUnlockTimestamp',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
        ],
        name: 'isOperator',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract ILBPool',
                name: 'lbp',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'excessReceiver',
                type: 'address',
            },
            {
                components: [
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
                internalType: 'struct ILBPMigrationRouter.WeightedPoolParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'migrateLiquidity',
        outputs: [
            {
                internalType: 'contract IWeightedPool',
                name: '',
                type: 'address',
            },
            { internalType: 'uint256[]', name: '', type: 'uint256[]' },
            { internalType: 'uint256', name: '', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'contract ILBPool',
                        name: 'lbp',
                        type: 'address',
                    },
                    {
                        internalType: 'contract IWeightedPool',
                        name: 'weightedPool',
                        type: 'address',
                    },
                    {
                        internalType: 'contract IERC20[]',
                        name: 'tokens',
                        type: 'address[]',
                    },
                    {
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'excessReceiver',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'bptLockDuration',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'bptPercentageToMigrate',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'migrationWeightProjectToken',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'migrationWeightReserveToken',
                        type: 'uint256',
                    },
                ],
                internalType: 'struct ILBPMigrationRouter.MigrationHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'migrateLiquidityHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'exactAmountsIn',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: 'bptAmountOut',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'bytes[]', name: 'data', type: 'bytes[]' }],
        name: 'multicall',
        outputs: [
            { internalType: 'bytes[]', name: 'results', type: 'bytes[]' },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
        name: 'name',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract ILBPool',
                name: 'lbp',
                type: 'address',
            },
            { internalType: 'address', name: 'sender', type: 'address' },
            {
                internalType: 'address',
                name: 'excessReceiver',
                type: 'address',
            },
            {
                components: [
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
                internalType: 'struct ILBPMigrationRouter.WeightedPoolParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'queryMigrateLiquidity',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'exactAmountsIn',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: 'bptAmountOut',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'bool', name: 'approved', type: 'bool' },
        ],
        name: 'setOperator',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' },
        ],
        name: 'supportsInterface',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
        name: 'symbol',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'receiver', type: 'address' },
            { internalType: 'uint256', name: 'id', type: 'uint256' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'sender', type: 'address' },
            { internalType: 'address', name: 'receiver', type: 'address' },
            { internalType: 'uint256', name: 'id', type: 'uint256' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'transferFrom',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'version',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'bptAddress',
                type: 'address',
            },
        ],
        name: 'withdrawBPT',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;
