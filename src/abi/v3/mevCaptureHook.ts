export const mevCaptureHookAbi_V3 = [
    {
        inputs: [
            {
                internalType: 'contract IVault',
                name: 'vault',
                type: 'address',
            },
            {
                internalType: 'contract IBalancerContractRegistry',
                name: 'registry',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'defaultMevTaxMultiplier',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'defaultMevTaxThreshold',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [],
        name: 'InvalidBalancerContractRegistry',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'MevCaptureHookNotRegisteredInPool',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'feePercentage',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'maxFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'MevSwapFeePercentageAboveMax',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'MevTaxExemptSenderAlreadyAdded',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'SenderIsNotVault',
        type: 'error',
    },
    {
        inputs: [],
        name: 'SenderNotAllowed',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'SenderNotRegisteredAsMevTaxExempt',
        type: 'error',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint256',
                name: 'newDefaultMevTaxMultiplier',
                type: 'uint256',
            },
        ],
        name: 'DefaultMevTaxMultiplierSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint256',
                name: 'newDefaultMevTaxThreshold',
                type: 'uint256',
            },
        ],
        name: 'DefaultMevTaxThresholdSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint256',
                name: 'maxMevSwapFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'MaxMevSwapFeePercentageSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'bool',
                name: 'enabled',
                type: 'bool',
            },
        ],
        name: 'MevTaxEnabledSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'MevTaxExemptSenderAdded',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'MevTaxExemptSenderRemoved',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'newPoolMevTaxMultiplier',
                type: 'uint256',
            },
        ],
        name: 'PoolMevTaxMultiplierSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'newPoolMevTaxThreshold',
                type: 'uint256',
            },
        ],
        name: 'PoolMevTaxThresholdSet',
        type: 'event',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'senders',
                type: 'address[]',
            },
        ],
        name: 'addMevTaxExemptSenders',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'disableMevTax',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'enableMevTax',
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
        name: 'getBalancerContractRegistry',
        outputs: [
            {
                internalType: 'contract IBalancerContractRegistry',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getDefaultMevTaxMultiplier',
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
        name: 'getDefaultMevTaxThreshold',
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
        name: 'getHookFlags',
        outputs: [
            {
                components: [
                    {
                        internalType: 'bool',
                        name: 'enableHookAdjustedAmounts',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeInitialize',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterInitialize',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallComputeDynamicSwapFee',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeSwap',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterSwap',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeAddLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterAddLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeRemoveLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterRemoveLiquidity',
                        type: 'bool',
                    },
                ],
                internalType: 'struct HookFlags',
                name: '',
                type: 'tuple',
            },
        ],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getMaxMevSwapFeePercentage',
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
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'getPoolMevTaxMultiplier',
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
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'getPoolMevTaxThreshold',
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
        name: 'isMevTaxEnabled',
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
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'isMevTaxExemptSender',
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
                name: '',
                type: 'address',
            },
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
            {
                internalType: 'enum AddLiquidityKind',
                name: '',
                type: 'uint8',
            },
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'amountsInRaw',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes',
                name: '',
                type: 'bytes',
            },
        ],
        name: 'onAfterAddLiquidity',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: '',
                type: 'bytes',
            },
        ],
        name: 'onAfterInitialize',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
            {
                internalType: 'enum RemoveLiquidityKind',
                name: '',
                type: 'uint8',
            },
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'amountsOutRaw',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes',
                name: '',
                type: 'bytes',
            },
        ],
        name: 'onAfterRemoveLiquidity',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'enum SwapKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'contract IERC20',
                        name: 'tokenIn',
                        type: 'address',
                    },
                    {
                        internalType: 'contract IERC20',
                        name: 'tokenOut',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountInScaled18',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountOutScaled18',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'tokenInBalanceScaled18',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'tokenOutBalanceScaled18',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountCalculatedScaled18',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountCalculatedRaw',
                        type: 'uint256',
                    },
                    {
                        internalType: 'address',
                        name: 'router',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct AfterSwapParams',
                name: '',
                type: 'tuple',
            },
        ],
        name: 'onAfterSwap',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'enum AddLiquidityKind',
                name: 'kind',
                type: 'uint8',
            },
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes',
                name: '',
                type: 'bytes',
            },
        ],
        name: 'onBeforeAddLiquidity',
        outputs: [
            {
                internalType: 'bool',
                name: 'success',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes',
                name: '',
                type: 'bytes',
            },
        ],
        name: 'onBeforeInitialize',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'enum RemoveLiquidityKind',
                name: 'kind',
                type: 'uint8',
            },
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes',
                name: '',
                type: 'bytes',
            },
        ],
        name: 'onBeforeRemoveLiquidity',
        outputs: [
            {
                internalType: 'bool',
                name: 'success',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'enum SwapKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountGivenScaled18',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'balancesScaled18',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'indexIn',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'indexOut',
                        type: 'uint256',
                    },
                    {
                        internalType: 'address',
                        name: 'router',
                        type: 'address',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct PoolSwapParams',
                name: '',
                type: 'tuple',
            },
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        name: 'onBeforeSwap',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'enum SwapKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountGivenScaled18',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'balancesScaled18',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'indexIn',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'indexOut',
                        type: 'uint256',
                    },
                    {
                        internalType: 'address',
                        name: 'router',
                        type: 'address',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct PoolSwapParams',
                name: 'params',
                type: 'tuple',
            },
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'staticSwapFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'onComputeDynamicSwapFeePercentage',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
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
        inputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
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
                name: '',
                type: 'tuple[]',
            },
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
                name: '',
                type: 'tuple',
            },
        ],
        name: 'onRegister',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'senders',
                type: 'address[]',
            },
        ],
        name: 'removeMevTaxExemptSenders',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'newDefaultMevTaxMultiplier',
                type: 'uint256',
            },
        ],
        name: 'setDefaultMevTaxMultiplier',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'newDefaultMevTaxThreshold',
                type: 'uint256',
            },
        ],
        name: 'setDefaultMevTaxThreshold',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'maxMevSwapFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'setMaxMevSwapFeePercentage',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'newPoolMevTaxMultiplier',
                type: 'uint256',
            },
        ],
        name: 'setPoolMevTaxMultiplier',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'newPoolMevTaxThreshold',
                type: 'uint256',
            },
        ],
        name: 'setPoolMevTaxThreshold',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;
