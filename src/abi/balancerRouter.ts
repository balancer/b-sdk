export const balancerRouterAbi = [
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
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
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
        inputs: [],
        name: 'EthTransfer',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'ExitBelowMin',
        type: 'error',
    },
    {
        inputs: [],
        name: 'FailedInnerCall',
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
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'SwapLimit',
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
                internalType: 'struct IRouter.AddLiquidityCallbackParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'addLiquidityCallback',
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
                internalType: 'uint256[]',
                name: 'inputAmountsIn',
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
        name: 'addLiquidityCustom',
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
                internalType: 'contract IERC20',
                name: 'tokenIn',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'maxAmountIn',
                type: 'uint256',
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
        name: 'addLiquiditySingleTokenExactOut',
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
                internalType: 'address',
                name: 'pool',
                type: 'address',
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
        name: 'addLiquidityUnbalanced',
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
        inputs: [
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
        name: 'initialize',
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
                internalType: 'struct IRouter.InitializeCallbackParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'initializeCallback',
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
                internalType: 'struct IRouter.AddLiquidityCallbackParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'queryAddLiquidityCallback',
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
                internalType: 'uint256[]',
                name: 'inputAmountsIn',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: 'minBptAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'queryAddLiquidityCustom',
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
                internalType: 'contract IERC20',
                name: 'tokenIn',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'maxAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'exactBptAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'queryAddLiquiditySingleTokenExactOut',
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
                internalType: 'address',
                name: 'pool',
                type: 'address',
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
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'queryAddLiquidityUnbalanced',
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
                internalType: 'struct IRouter.RemoveLiquidityCallbackParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'queryRemoveLiquidityCallback',
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
                internalType: 'uint256',
                name: 'maxBptAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256[]',
                name: 'minAmountsOut',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'queryRemoveLiquidityCustom',
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
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'queryRemoveLiquidityProportional',
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
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactBptAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'contract IERC20',
                name: 'tokenOut',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'minAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'queryRemoveLiquiditySingleTokenExactIn',
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
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'maxBptAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'contract IERC20',
                name: 'tokenOut',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'queryRemoveLiquiditySingleTokenExactOut',
        outputs: [
            {
                internalType: 'uint256',
                name: 'bptAmountIn',
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
                internalType: 'struct IRouter.SwapCallbackParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'querySwapCallback',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
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
                name: 'exactAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'querySwapExactIn',
        outputs: [
            {
                internalType: 'uint256',
                name: 'amountCalculated',
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
                name: 'exactAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'querySwapExactOut',
        outputs: [
            {
                internalType: 'uint256',
                name: 'amountCalculated',
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
                internalType: 'struct IRouter.RemoveLiquidityCallbackParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'removeLiquidityCallback',
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
                internalType: 'uint256',
                name: 'maxBptAmountIn',
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
        name: 'removeLiquidityCustom',
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
        name: 'removeLiquidityProportional',
        outputs: [
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
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactBptAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'contract IERC20',
                name: 'tokenOut',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'minAmountOut',
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
        name: 'removeLiquiditySingleTokenExactIn',
        outputs: [
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
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'maxBptAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'contract IERC20',
                name: 'tokenOut',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactAmountOut',
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
        name: 'removeLiquiditySingleTokenExactOut',
        outputs: [
            {
                internalType: 'uint256',
                name: 'bptAmountIn',
                type: 'uint256',
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
                internalType: 'struct IRouter.SwapCallbackParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'swapCallback',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
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
                name: 'exactAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'minAmountOut',
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
        name: 'swapExactIn',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
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
                name: 'exactAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'maxAmountIn',
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
        name: 'swapExactOut',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        stateMutability: 'payable',
        type: 'receive',
    },
] as const;
