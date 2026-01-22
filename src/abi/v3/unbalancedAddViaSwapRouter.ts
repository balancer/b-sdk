export const unbalancedAddViaSwapRouterAbi_V3 = [
    {
        inputs: [
            {
                internalType: 'contract IVault',
                name: 'vault',
                type: 'address',
            },
            {
                internalType: 'contract IWETH',
                name: 'weth',
                type: 'address',
            },
            {
                internalType: 'contract IPermit2',
                name: 'permit2',
                type: 'address',
            },
            {
                internalType: 'string',
                name: 'routerVersion',
                type: 'string',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'target',
                type: 'address',
            },
        ],
        name: 'AddressEmptyCode',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'maxAdjustableAmount',
                type: 'uint256',
            },
        ],
        name: 'AmountInAboveMaxAdjustableAmount',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'exactAmount',
                type: 'uint256',
            },
        ],
        name: 'AmountInDoesNotMatchExact',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ErrorSelectorNotFound',
        type: 'error',
    },
    {
        inputs: [],
        name: 'EthTransfer',
        type: 'error',
    },
    {
        inputs: [],
        name: 'FailedCall',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InputLengthMismatch',
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
        name: 'InsufficientBalance',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InsufficientEth',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'InsufficientPayment',
        type: 'error',
    },
    {
        inputs: [],
        name: 'NotTwoTokenPool',
        type: 'error',
    },
    {
        inputs: [],
        name: 'OperationNotSupported',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ReentrancyGuardReentrantCall',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint8',
                name: 'bits',
                type: 'uint8',
            },
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'SafeCastOverflowedUintDowncast',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'SafeERC20FailedOperation',
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
        name: 'SwapDeadline',
        type: 'error',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'maxAmountsIn',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'minBptAmountOut',
                        type: 'uint256',
                    },
                    {
                        internalType: 'enum AddLiquidityKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'bool',
                        name: 'wethIsEth',
                        type: 'bool',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct AddLiquidityHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'addLiquidityHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'amountsIn',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: 'bptAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'returnData',
                type: 'bytes',
            },
        ],
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
                name: 'deadline',
                type: 'uint256',
            },
            {
                internalType: 'bool',
                name: 'wethIsEth',
                type: 'bool',
            },
            {
                components: [
                    {
                        internalType: 'uint256',
                        name: 'exactBptAmountOut',
                        type: 'uint256',
                    },
                    {
                        internalType: 'contract IERC20',
                        name: 'exactToken',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'exactAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'maxAdjustableAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'addLiquidityUserData',
                        type: 'bytes',
                    },
                    {
                        internalType: 'bytes',
                        name: 'swapUserData',
                        type: 'bytes',
                    },
                ],
                internalType:
                    'struct IUnbalancedAddViaSwapRouter.AddLiquidityAndSwapParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'addLiquidityUnbalanced',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'amountsIn',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'deadline',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bool',
                        name: 'wethIsEth',
                        type: 'bool',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint256',
                                name: 'exactBptAmountOut',
                                type: 'uint256',
                            },
                            {
                                internalType: 'contract IERC20',
                                name: 'exactToken',
                                type: 'address',
                            },
                            {
                                internalType: 'uint256',
                                name: 'exactAmount',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint256',
                                name: 'maxAdjustableAmount',
                                type: 'uint256',
                            },
                            {
                                internalType: 'bytes',
                                name: 'addLiquidityUserData',
                                type: 'bytes',
                            },
                            {
                                internalType: 'bytes',
                                name: 'swapUserData',
                                type: 'bytes',
                            },
                        ],
                        internalType:
                            'struct IUnbalancedAddViaSwapRouter.AddLiquidityAndSwapParams',
                        name: 'operationParams',
                        type: 'tuple',
                    },
                ],
                internalType:
                    'struct IUnbalancedAddViaSwapRouter.AddLiquidityAndSwapHookParams',
                name: 'hookParams',
                type: 'tuple',
            },
        ],
        name: 'addLiquidityUnbalancedHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'amountsIn',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getPermit2',
        outputs: [
            {
                internalType: 'contract IPermit2',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getSender',
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
        name: 'getWeth',
        outputs: [
            {
                internalType: 'contract IWETH',
                name: '',
                type: 'address',
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
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'contract IERC20[]',
                        name: 'tokens',
                        type: 'address[]',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'exactAmountsIn',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'minBptAmountOut',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bool',
                        name: 'wethIsEth',
                        type: 'bool',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct InitializeHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'initializeHook',
        outputs: [
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
            {
                internalType: 'bytes[]',
                name: 'data',
                type: 'bytes[]',
            },
        ],
        name: 'multicall',
        outputs: [
            {
                internalType: 'bytes[]',
                name: 'results',
                type: 'bytes[]',
            },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'token',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'owner',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'spender',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'nonce',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'deadline',
                        type: 'uint256',
                    },
                ],
                internalType: 'struct IRouterCommon.PermitApproval[]',
                name: 'permitBatch',
                type: 'tuple[]',
            },
            {
                internalType: 'bytes[]',
                name: 'permitSignatures',
                type: 'bytes[]',
            },
            {
                components: [
                    {
                        components: [
                            {
                                internalType: 'address',
                                name: 'token',
                                type: 'address',
                            },
                            {
                                internalType: 'uint160',
                                name: 'amount',
                                type: 'uint160',
                            },
                            {
                                internalType: 'uint48',
                                name: 'expiration',
                                type: 'uint48',
                            },
                            {
                                internalType: 'uint48',
                                name: 'nonce',
                                type: 'uint48',
                            },
                        ],
                        internalType:
                            'struct IAllowanceTransfer.PermitDetails[]',
                        name: 'details',
                        type: 'tuple[]',
                    },
                    {
                        internalType: 'address',
                        name: 'spender',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'sigDeadline',
                        type: 'uint256',
                    },
                ],
                internalType: 'struct IAllowanceTransfer.PermitBatch',
                name: 'permit2Batch',
                type: 'tuple',
            },
            {
                internalType: 'bytes',
                name: 'permit2Signature',
                type: 'bytes',
            },
            {
                internalType: 'bytes[]',
                name: 'multicallData',
                type: 'bytes[]',
            },
        ],
        name: 'permitBatchAndCall',
        outputs: [
            {
                internalType: 'bytes[]',
                name: '',
                type: 'bytes[]',
            },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'maxAmountsIn',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'minBptAmountOut',
                        type: 'uint256',
                    },
                    {
                        internalType: 'enum AddLiquidityKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'bool',
                        name: 'wethIsEth',
                        type: 'bool',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct AddLiquidityHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'queryAddLiquidityHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'amountsIn',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: 'bptAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'returnData',
                type: 'bytes',
            },
        ],
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
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                components: [
                    {
                        internalType: 'uint256',
                        name: 'exactBptAmountOut',
                        type: 'uint256',
                    },
                    {
                        internalType: 'contract IERC20',
                        name: 'exactToken',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'exactAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'maxAdjustableAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'addLiquidityUserData',
                        type: 'bytes',
                    },
                    {
                        internalType: 'bytes',
                        name: 'swapUserData',
                        type: 'bytes',
                    },
                ],
                internalType:
                    'struct IUnbalancedAddViaSwapRouter.AddLiquidityAndSwapParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'queryAddLiquidityUnbalanced',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'amountsIn',
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
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'deadline',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bool',
                        name: 'wethIsEth',
                        type: 'bool',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint256',
                                name: 'exactBptAmountOut',
                                type: 'uint256',
                            },
                            {
                                internalType: 'contract IERC20',
                                name: 'exactToken',
                                type: 'address',
                            },
                            {
                                internalType: 'uint256',
                                name: 'exactAmount',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint256',
                                name: 'maxAdjustableAmount',
                                type: 'uint256',
                            },
                            {
                                internalType: 'bytes',
                                name: 'addLiquidityUserData',
                                type: 'bytes',
                            },
                            {
                                internalType: 'bytes',
                                name: 'swapUserData',
                                type: 'bytes',
                            },
                        ],
                        internalType:
                            'struct IUnbalancedAddViaSwapRouter.AddLiquidityAndSwapParams',
                        name: 'operationParams',
                        type: 'tuple',
                    },
                ],
                internalType:
                    'struct IUnbalancedAddViaSwapRouter.AddLiquidityAndSwapHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'queryAddLiquidityUnbalancedHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'amountsIn',
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
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'minAmountsOut',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'maxBptAmountIn',
                        type: 'uint256',
                    },
                    {
                        internalType: 'enum RemoveLiquidityKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'bool',
                        name: 'wethIsEth',
                        type: 'bool',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct RemoveLiquidityHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'queryRemoveLiquidityHook',
        outputs: [
            {
                internalType: 'uint256',
                name: 'bptAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256[]',
                name: 'amountsOut',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes',
                name: 'returnData',
                type: 'bytes',
            },
        ],
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
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactBptAmountIn',
                type: 'uint256',
            },
        ],
        name: 'queryRemoveLiquidityRecoveryHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'amountsOut',
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
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'enum SwapKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
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
                        name: 'amountGiven',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'limit',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'deadline',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bool',
                        name: 'wethIsEth',
                        type: 'bool',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct SwapSingleTokenHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'querySwapHook',
        outputs: [
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
                components: [
                    {
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'minAmountsOut',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'maxBptAmountIn',
                        type: 'uint256',
                    },
                    {
                        internalType: 'enum RemoveLiquidityKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'bool',
                        name: 'wethIsEth',
                        type: 'bool',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct RemoveLiquidityHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'removeLiquidityHook',
        outputs: [
            {
                internalType: 'uint256',
                name: 'bptAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256[]',
                name: 'amountsOut',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes',
                name: 'returnData',
                type: 'bytes',
            },
        ],
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
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactBptAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256[]',
                name: 'minAmountsOut',
                type: 'uint256[]',
            },
        ],
        name: 'removeLiquidityRecoveryHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'amountsOut',
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
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'enum SwapKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
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
                        name: 'amountGiven',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'limit',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'deadline',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bool',
                        name: 'wethIsEth',
                        type: 'bool',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct SwapSingleTokenHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'swapSingleTokenHook',
        outputs: [
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
    {
        stateMutability: 'payable',
        type: 'receive',
    },
] as const;
