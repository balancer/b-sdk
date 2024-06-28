export const balancerBatchRouterAbi = [
    {
        inputs: [
            { internalType: 'contract IVault', name: 'vault', type: 'address' },
            { internalType: 'contract IWETH', name: 'weth', type: 'address' },
            {
                internalType: 'contract IPermit2',
                name: 'permit2',
                type: 'address',
            },
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
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'AddressInsufficientBalance',
        type: 'error',
    },
    { inputs: [], name: 'EthTransfer', type: 'error' },
    { inputs: [], name: 'FailedInnerCall', type: 'error' },
    { inputs: [], name: 'InsufficientEth', type: 'error' },
    { inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
    {
        inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
        name: 'SafeERC20FailedOperation',
        type: 'error',
    },
    {
        inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
        name: 'SenderIsNotVault',
        type: 'error',
    },
    { inputs: [], name: 'SwapDeadline', type: 'error' },
    {
        inputs: [],
        name: 'getSender',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'contract IERC20',
                        name: 'tokenIn',
                        type: 'address',
                    },
                    {
                        components: [
                            {
                                internalType: 'address',
                                name: 'pool',
                                type: 'address',
                            },
                            {
                                internalType: 'contract IERC20',
                                name: 'tokenOut',
                                type: 'address',
                            },
                            {
                                internalType: 'bool',
                                name: 'isBuffer',
                                type: 'bool',
                            },
                        ],
                        internalType: 'struct IBatchRouter.SwapPathStep[]',
                        name: 'steps',
                        type: 'tuple[]',
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
                ],
                internalType: 'struct IBatchRouter.SwapPathExactAmountIn[]',
                name: 'paths',
                type: 'tuple[]',
            },
            { internalType: 'bytes', name: 'userData', type: 'bytes' },
        ],
        name: 'querySwapExactIn',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'pathAmountsOut',
                type: 'uint256[]',
            },
            { internalType: 'address[]', name: 'tokensOut', type: 'address[]' },
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
                        components: [
                            {
                                internalType: 'contract IERC20',
                                name: 'tokenIn',
                                type: 'address',
                            },
                            {
                                components: [
                                    {
                                        internalType: 'address',
                                        name: 'pool',
                                        type: 'address',
                                    },
                                    {
                                        internalType: 'contract IERC20',
                                        name: 'tokenOut',
                                        type: 'address',
                                    },
                                    {
                                        internalType: 'bool',
                                        name: 'isBuffer',
                                        type: 'bool',
                                    },
                                ],
                                internalType:
                                    'struct IBatchRouter.SwapPathStep[]',
                                name: 'steps',
                                type: 'tuple[]',
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
                        ],
                        internalType:
                            'struct IBatchRouter.SwapPathExactAmountIn[]',
                        name: 'paths',
                        type: 'tuple[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'deadline',
                        type: 'uint256',
                    },
                    { internalType: 'bool', name: 'wethIsEth', type: 'bool' },
                    { internalType: 'bytes', name: 'userData', type: 'bytes' },
                ],
                internalType: 'struct IBatchRouter.SwapExactInHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'querySwapExactInHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'pathAmountsOut',
                type: 'uint256[]',
            },
            { internalType: 'address[]', name: 'tokensOut', type: 'address[]' },
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
                components: [
                    {
                        internalType: 'contract IERC20',
                        name: 'tokenIn',
                        type: 'address',
                    },
                    {
                        components: [
                            {
                                internalType: 'address',
                                name: 'pool',
                                type: 'address',
                            },
                            {
                                internalType: 'contract IERC20',
                                name: 'tokenOut',
                                type: 'address',
                            },
                            {
                                internalType: 'bool',
                                name: 'isBuffer',
                                type: 'bool',
                            },
                        ],
                        internalType: 'struct IBatchRouter.SwapPathStep[]',
                        name: 'steps',
                        type: 'tuple[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'maxAmountIn',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'exactAmountOut',
                        type: 'uint256',
                    },
                ],
                internalType: 'struct IBatchRouter.SwapPathExactAmountOut[]',
                name: 'paths',
                type: 'tuple[]',
            },
            { internalType: 'bytes', name: 'userData', type: 'bytes' },
        ],
        name: 'querySwapExactOut',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'pathAmountsIn',
                type: 'uint256[]',
            },
            { internalType: 'address[]', name: 'tokensIn', type: 'address[]' },
            { internalType: 'uint256[]', name: 'amountsIn', type: 'uint256[]' },
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
                        components: [
                            {
                                internalType: 'contract IERC20',
                                name: 'tokenIn',
                                type: 'address',
                            },
                            {
                                components: [
                                    {
                                        internalType: 'address',
                                        name: 'pool',
                                        type: 'address',
                                    },
                                    {
                                        internalType: 'contract IERC20',
                                        name: 'tokenOut',
                                        type: 'address',
                                    },
                                    {
                                        internalType: 'bool',
                                        name: 'isBuffer',
                                        type: 'bool',
                                    },
                                ],
                                internalType:
                                    'struct IBatchRouter.SwapPathStep[]',
                                name: 'steps',
                                type: 'tuple[]',
                            },
                            {
                                internalType: 'uint256',
                                name: 'maxAmountIn',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint256',
                                name: 'exactAmountOut',
                                type: 'uint256',
                            },
                        ],
                        internalType:
                            'struct IBatchRouter.SwapPathExactAmountOut[]',
                        name: 'paths',
                        type: 'tuple[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'deadline',
                        type: 'uint256',
                    },
                    { internalType: 'bool', name: 'wethIsEth', type: 'bool' },
                    { internalType: 'bytes', name: 'userData', type: 'bytes' },
                ],
                internalType: 'struct IBatchRouter.SwapExactOutHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'querySwapExactOutHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'pathAmountsIn',
                type: 'uint256[]',
            },
            { internalType: 'address[]', name: 'tokensIn', type: 'address[]' },
            { internalType: 'uint256[]', name: 'amountsIn', type: 'uint256[]' },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'contract IERC20',
                        name: 'tokenIn',
                        type: 'address',
                    },
                    {
                        components: [
                            {
                                internalType: 'address',
                                name: 'pool',
                                type: 'address',
                            },
                            {
                                internalType: 'contract IERC20',
                                name: 'tokenOut',
                                type: 'address',
                            },
                            {
                                internalType: 'bool',
                                name: 'isBuffer',
                                type: 'bool',
                            },
                        ],
                        internalType: 'struct IBatchRouter.SwapPathStep[]',
                        name: 'steps',
                        type: 'tuple[]',
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
                ],
                internalType: 'struct IBatchRouter.SwapPathExactAmountIn[]',
                name: 'paths',
                type: 'tuple[]',
            },
            { internalType: 'uint256', name: 'deadline', type: 'uint256' },
            { internalType: 'bool', name: 'wethIsEth', type: 'bool' },
            { internalType: 'bytes', name: 'userData', type: 'bytes' },
        ],
        name: 'swapExactIn',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'pathAmountsOut',
                type: 'uint256[]',
            },
            { internalType: 'address[]', name: 'tokensOut', type: 'address[]' },
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
                components: [
                    {
                        internalType: 'address',
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        components: [
                            {
                                internalType: 'contract IERC20',
                                name: 'tokenIn',
                                type: 'address',
                            },
                            {
                                components: [
                                    {
                                        internalType: 'address',
                                        name: 'pool',
                                        type: 'address',
                                    },
                                    {
                                        internalType: 'contract IERC20',
                                        name: 'tokenOut',
                                        type: 'address',
                                    },
                                    {
                                        internalType: 'bool',
                                        name: 'isBuffer',
                                        type: 'bool',
                                    },
                                ],
                                internalType:
                                    'struct IBatchRouter.SwapPathStep[]',
                                name: 'steps',
                                type: 'tuple[]',
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
                        ],
                        internalType:
                            'struct IBatchRouter.SwapPathExactAmountIn[]',
                        name: 'paths',
                        type: 'tuple[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'deadline',
                        type: 'uint256',
                    },
                    { internalType: 'bool', name: 'wethIsEth', type: 'bool' },
                    { internalType: 'bytes', name: 'userData', type: 'bytes' },
                ],
                internalType: 'struct IBatchRouter.SwapExactInHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'swapExactInHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'pathAmountsOut',
                type: 'uint256[]',
            },
            { internalType: 'address[]', name: 'tokensOut', type: 'address[]' },
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
                components: [
                    {
                        internalType: 'contract IERC20',
                        name: 'tokenIn',
                        type: 'address',
                    },
                    {
                        components: [
                            {
                                internalType: 'address',
                                name: 'pool',
                                type: 'address',
                            },
                            {
                                internalType: 'contract IERC20',
                                name: 'tokenOut',
                                type: 'address',
                            },
                            {
                                internalType: 'bool',
                                name: 'isBuffer',
                                type: 'bool',
                            },
                        ],
                        internalType: 'struct IBatchRouter.SwapPathStep[]',
                        name: 'steps',
                        type: 'tuple[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'maxAmountIn',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'exactAmountOut',
                        type: 'uint256',
                    },
                ],
                internalType: 'struct IBatchRouter.SwapPathExactAmountOut[]',
                name: 'paths',
                type: 'tuple[]',
            },
            { internalType: 'uint256', name: 'deadline', type: 'uint256' },
            { internalType: 'bool', name: 'wethIsEth', type: 'bool' },
            { internalType: 'bytes', name: 'userData', type: 'bytes' },
        ],
        name: 'swapExactOut',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'pathAmountsIn',
                type: 'uint256[]',
            },
            { internalType: 'address[]', name: 'tokensIn', type: 'address[]' },
            { internalType: 'uint256[]', name: 'amountsIn', type: 'uint256[]' },
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
                        components: [
                            {
                                internalType: 'contract IERC20',
                                name: 'tokenIn',
                                type: 'address',
                            },
                            {
                                components: [
                                    {
                                        internalType: 'address',
                                        name: 'pool',
                                        type: 'address',
                                    },
                                    {
                                        internalType: 'contract IERC20',
                                        name: 'tokenOut',
                                        type: 'address',
                                    },
                                    {
                                        internalType: 'bool',
                                        name: 'isBuffer',
                                        type: 'bool',
                                    },
                                ],
                                internalType:
                                    'struct IBatchRouter.SwapPathStep[]',
                                name: 'steps',
                                type: 'tuple[]',
                            },
                            {
                                internalType: 'uint256',
                                name: 'maxAmountIn',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint256',
                                name: 'exactAmountOut',
                                type: 'uint256',
                            },
                        ],
                        internalType:
                            'struct IBatchRouter.SwapPathExactAmountOut[]',
                        name: 'paths',
                        type: 'tuple[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'deadline',
                        type: 'uint256',
                    },
                    { internalType: 'bool', name: 'wethIsEth', type: 'bool' },
                    { internalType: 'bytes', name: 'userData', type: 'bytes' },
                ],
                internalType: 'struct IBatchRouter.SwapExactOutHookParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'swapExactOutHook',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'pathAmountsIn',
                type: 'uint256[]',
            },
            { internalType: 'address[]', name: 'tokensIn', type: 'address[]' },
            { internalType: 'uint256[]', name: 'amountsIn', type: 'uint256[]' },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    { stateMutability: 'payable', type: 'receive' },
] as const;
