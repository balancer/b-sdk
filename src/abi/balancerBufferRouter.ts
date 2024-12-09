export const balancerBufferRouterAbi = [
    {
        inputs: [
            { internalType: 'contract IVault', name: 'vault', type: 'address' },
            { internalType: 'contract IWETH', name: 'weth', type: 'address' },
            {
                internalType: 'contract IPermit2',
                name: 'permit2',
                type: 'address',
            },
            { internalType: 'string', name: 'routerVersion', type: 'string' },
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
    { inputs: [], name: 'ErrorSelectorNotFound', type: 'error' },
    { inputs: [], name: 'EthTransfer', type: 'error' },
    { inputs: [], name: 'FailedInnerCall', type: 'error' },
    { inputs: [], name: 'InputLengthMismatch', type: 'error' },
    { inputs: [], name: 'InsufficientEth', type: 'error' },
    { inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
    {
        inputs: [
            { internalType: 'uint8', name: 'bits', type: 'uint8' },
            { internalType: 'uint256', name: 'value', type: 'uint256' },
        ],
        name: 'SafeCastOverflowedUintDowncast',
        type: 'error',
    },
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
        inputs: [
            {
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'maxAmountUnderlyingIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'maxAmountWrappedIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'exactSharesToIssue',
                type: 'uint256',
            },
        ],
        name: 'addLiquidityToBuffer',
        outputs: [
            {
                internalType: 'uint256',
                name: 'amountUnderlyingIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'amountWrappedIn',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'maxAmountUnderlyingIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'maxAmountWrappedIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'exactSharesToIssue',
                type: 'uint256',
            },
            { internalType: 'address', name: 'sharesOwner', type: 'address' },
        ],
        name: 'addLiquidityToBufferHook',
        outputs: [
            {
                internalType: 'uint256',
                name: 'amountUnderlyingIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'amountWrappedIn',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
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
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactAmountUnderlyingIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'exactAmountWrappedIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'minIssuedShares',
                type: 'uint256',
            },
        ],
        name: 'initializeBuffer',
        outputs: [
            { internalType: 'uint256', name: 'issuedShares', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactAmountUnderlyingIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'exactAmountWrappedIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'minIssuedShares',
                type: 'uint256',
            },
            { internalType: 'address', name: 'sharesOwner', type: 'address' },
        ],
        name: 'initializeBufferHook',
        outputs: [
            { internalType: 'uint256', name: 'issuedShares', type: 'uint256' },
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
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    { internalType: 'address', name: 'token', type: 'address' },
                    { internalType: 'address', name: 'owner', type: 'address' },
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
                    { internalType: 'uint256', name: 'nonce', type: 'uint256' },
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
            { internalType: 'bytes', name: 'permit2Signature', type: 'bytes' },
            { internalType: 'bytes[]', name: 'multicallData', type: 'bytes[]' },
        ],
        name: 'permitBatchAndCall',
        outputs: [
            { internalType: 'bytes[]', name: 'results', type: 'bytes[]' },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactSharesToIssue',
                type: 'uint256',
            },
        ],
        name: 'queryAddLiquidityToBuffer',
        outputs: [
            {
                internalType: 'uint256',
                name: 'amountUnderlyingIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'amountWrappedIn',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactSharesToIssue',
                type: 'uint256',
            },
        ],
        name: 'queryAddLiquidityToBufferHook',
        outputs: [
            {
                internalType: 'uint256',
                name: 'amountUnderlyingIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'amountWrappedIn',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactAmountUnderlyingIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'exactAmountWrappedIn',
                type: 'uint256',
            },
        ],
        name: 'queryInitializeBuffer',
        outputs: [
            { internalType: 'uint256', name: 'issuedShares', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactAmountUnderlyingIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'exactAmountWrappedIn',
                type: 'uint256',
            },
        ],
        name: 'queryInitializeBufferHook',
        outputs: [
            { internalType: 'uint256', name: 'issuedShares', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactSharesToRemove',
                type: 'uint256',
            },
        ],
        name: 'queryRemoveLiquidityFromBuffer',
        outputs: [
            {
                internalType: 'uint256',
                name: 'removedUnderlyingBalanceOut',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'removedWrappedBalanceOut',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC4626',
                name: 'wrappedToken',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactSharesToRemove',
                type: 'uint256',
            },
        ],
        name: 'queryRemoveLiquidityFromBufferHook',
        outputs: [
            {
                internalType: 'uint256',
                name: 'removedUnderlyingBalanceOut',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'removedWrappedBalanceOut',
                type: 'uint256',
            },
        ],
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
    { stateMutability: 'payable', type: 'receive' },
] as const;
