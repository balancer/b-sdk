export const compositeLiquidityRouterAbi = [
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
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'AddressInsufficientBalance',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'tokenIn',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'maxAmountIn',
                type: 'uint256',
            },
        ],
        name: 'AmountInAboveMax',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'tokenOut',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amountOut',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'minAmountOut',
                type: 'uint256',
            },
        ],
        name: 'AmountOutBelowMin',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
        ],
        name: 'BufferNotInitialized',
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
        name: 'FailedInnerCall',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InputLengthMismatch',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InsufficientEth',
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
                internalType: 'address[]',
                name: 'expectedTokensOut',
                type: 'address[]',
            },
            {
                internalType: 'address[]',
                name: 'tokensOut',
                type: 'address[]',
            },
        ],
        name: 'WrongTokensOut',
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
                internalType: 'struct IRouterCommon.AddLiquidityHookParams',
                name: 'params',
                type: 'tuple',
            },
            {
                internalType: 'bool[]',
                name: 'wrapUnderlying',
                type: 'bool[]',
            },
        ],
        name: 'addLiquidityERC4626PoolProportionalHook',
        outputs: [
            {
                internalType: 'address[]',
                name: 'tokensIn',
                type: 'address[]',
            },
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
                internalType: 'struct IRouterCommon.AddLiquidityHookParams',
                name: 'params',
                type: 'tuple',
            },
            {
                internalType: 'bool[]',
                name: 'wrapUnderlying',
                type: 'bool[]',
            },
        ],
        name: 'addLiquidityERC4626PoolUnbalancedHook',
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
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'bool[]',
                name: 'wrapUnderlying',
                type: 'bool[]',
            },
            {
                internalType: 'uint256[]',
                name: 'maxAmountsIn',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: 'exactBptAmountOut',
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
        name: 'addLiquidityProportionalToERC4626Pool',
        outputs: [
            {
                internalType: 'address[]',
                name: 'tokensIn',
                type: 'address[]',
            },
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
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'bool[]',
                name: 'wrapUnderlying',
                type: 'bool[]',
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
        name: 'addLiquidityUnbalancedToERC4626Pool',
        outputs: [
            {
                internalType: 'uint256',
                name: 'bptAmountOut',
                type: 'uint256',
            },
        ],
        stateMutability: 'payable',
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
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'bool[]',
                name: 'wrapUnderlying',
                type: 'bool[]',
            },
            {
                internalType: 'uint256',
                name: 'exactBptAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'queryAddLiquidityProportionalToERC4626Pool',
        outputs: [
            {
                internalType: 'address[]',
                name: 'tokensIn',
                type: 'address[]',
            },
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
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'bool[]',
                name: 'wrapUnderlying',
                type: 'bool[]',
            },
            {
                internalType: 'uint256[]',
                name: 'exactAmountsIn',
                type: 'uint256[]',
            },
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'queryAddLiquidityUnbalancedToERC4626Pool',
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
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'bool[]',
                name: 'unwrapWrapped',
                type: 'bool[]',
            },
            {
                internalType: 'uint256',
                name: 'exactBptAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'queryRemoveLiquidityProportionalFromERC4626Pool',
        outputs: [
            {
                internalType: 'address[]',
                name: 'tokensOut',
                type: 'address[]',
            },
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
                internalType: 'struct IRouterCommon.RemoveLiquidityHookParams',
                name: 'params',
                type: 'tuple',
            },
            {
                internalType: 'bool[]',
                name: 'unwrapWrapped',
                type: 'bool[]',
            },
        ],
        name: 'removeLiquidityERC4626PoolProportionalHook',
        outputs: [
            {
                internalType: 'address[]',
                name: 'tokensOut',
                type: 'address[]',
            },
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
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'bool[]',
                name: 'unwrapWrapped',
                type: 'bool[]',
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
        name: 'removeLiquidityProportionalFromERC4626Pool',
        outputs: [
            {
                internalType: 'address[]',
                name: 'tokensOut',
                type: 'address[]',
            },
            {
                internalType: 'uint256[]',
                name: 'amountsOut',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'payable',
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
