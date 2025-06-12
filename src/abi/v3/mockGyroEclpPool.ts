export const mockGyroEclpPoolAbi_V3 = [
    {
        inputs: [
            {
                components: [
                    { internalType: 'string', name: 'name', type: 'string' },
                    { internalType: 'string', name: 'symbol', type: 'string' },
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
                    { internalType: 'string', name: 'version', type: 'string' },
                ],
                internalType: 'struct IGyroECLPPool.GyroECLPPoolParams',
                name: 'params',
                type: 'tuple',
            },
            { internalType: 'contract IVault', name: 'vault', type: 'address' },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    { inputs: [], name: 'AssetBoundsExceeded', type: 'error' },
    { inputs: [], name: 'DerivedDsqWrong', type: 'error' },
    { inputs: [], name: 'DerivedTauAlphaNotNormalized', type: 'error' },
    { inputs: [], name: 'DerivedTauAlphaYWrong', type: 'error' },
    { inputs: [], name: 'DerivedTauBetaNotNormalized', type: 'error' },
    { inputs: [], name: 'DerivedTauBetaYWrong', type: 'error' },
    { inputs: [], name: 'DerivedTauXWrong', type: 'error' },
    { inputs: [], name: 'DerivedUWrong', type: 'error' },
    { inputs: [], name: 'DerivedVWrong', type: 'error' },
    { inputs: [], name: 'DerivedWWrong', type: 'error' },
    { inputs: [], name: 'DerivedZWrong', type: 'error' },
    { inputs: [], name: 'ECDSAInvalidSignature', type: 'error' },
    {
        inputs: [{ internalType: 'uint256', name: 'length', type: 'uint256' }],
        name: 'ECDSAInvalidSignatureLength',
        type: 'error',
    },
    {
        inputs: [{ internalType: 'bytes32', name: 's', type: 'bytes32' }],
        name: 'ECDSAInvalidSignatureS',
        type: 'error',
    },
    {
        inputs: [
            { internalType: 'uint256', name: 'deadline', type: 'uint256' },
        ],
        name: 'ERC2612ExpiredSignature',
        type: 'error',
    },
    {
        inputs: [
            { internalType: 'address', name: 'signer', type: 'address' },
            { internalType: 'address', name: 'owner', type: 'address' },
        ],
        name: 'ERC2612InvalidSigner',
        type: 'error',
    },
    {
        inputs: [
            { internalType: 'address', name: 'account', type: 'address' },
            { internalType: 'uint256', name: 'currentNonce', type: 'uint256' },
        ],
        name: 'InvalidAccountNonce',
        type: 'error',
    },
    { inputs: [], name: 'InvalidShortString', type: 'error' },
    { inputs: [], name: 'InvariantDenominatorWrong', type: 'error' },
    { inputs: [], name: 'MaxAssetsExceeded', type: 'error' },
    { inputs: [], name: 'MaxInvariantExceeded', type: 'error' },
    { inputs: [], name: 'MulOverflow', type: 'error' },
    { inputs: [], name: 'RotationVectorCWrong', type: 'error' },
    { inputs: [], name: 'RotationVectorNotNormalized', type: 'error' },
    { inputs: [], name: 'RotationVectorSWrong', type: 'error' },
    {
        inputs: [{ internalType: 'int256', name: 'value', type: 'int256' }],
        name: 'SafeCastOverflowedIntToUint',
        type: 'error',
    },
    {
        inputs: [{ internalType: 'uint256', name: 'value', type: 'uint256' }],
        name: 'SafeCastOverflowedUintToInt',
        type: 'error',
    },
    {
        inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
        name: 'SenderIsNotVault',
        type: 'error',
    },
    { inputs: [], name: 'StretchingFactorWrong', type: 'error' },
    {
        inputs: [{ internalType: 'string', name: 'str', type: 'string' }],
        name: 'StringTooLong',
        type: 'error',
    },
    { inputs: [], name: 'ZeroDivision', type: 'error' },
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
                internalType: 'uint256',
                name: 'value',
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
                indexed: false,
                internalType: 'bool',
                name: 'derivedParamsValidated',
                type: 'bool',
            },
        ],
        name: 'ECLPDerivedParamsValidated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'bool',
                name: 'paramsValidated',
                type: 'bool',
            },
        ],
        name: 'ECLPParamsValidated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [],
        name: 'EIP712DomainChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'Transfer',
        type: 'event',
    },
    {
        inputs: [],
        name: 'DOMAIN_SEPARATOR',
        outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'PERMIT_TYPEHASH',
        outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256[]',
                name: 'balancesLiveScaled18',
                type: 'uint256[]',
            },
            { internalType: 'uint256', name: 'tokenInIndex', type: 'uint256' },
            {
                internalType: 'uint256',
                name: 'invariantRatio',
                type: 'uint256',
            },
        ],
        name: 'computeBalance',
        outputs: [
            { internalType: 'uint256', name: 'newBalance', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256[]',
                name: 'balancesLiveScaled18',
                type: 'uint256[]',
            },
            { internalType: 'enum Rounding', name: 'rounding', type: 'uint8' },
        ],
        name: 'computeInvariant',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'eip712Domain',
        outputs: [
            { internalType: 'bytes1', name: 'fields', type: 'bytes1' },
            { internalType: 'string', name: 'name', type: 'string' },
            { internalType: 'string', name: 'version', type: 'string' },
            { internalType: 'uint256', name: 'chainId', type: 'uint256' },
            {
                internalType: 'address',
                name: 'verifyingContract',
                type: 'address',
            },
            { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
            {
                internalType: 'uint256[]',
                name: 'extensions',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'emitApproval',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'from', type: 'address' },
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'emitTransfer',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getAggregateFeePercentages',
        outputs: [
            {
                internalType: 'uint256',
                name: 'aggregateSwapFeePercentage',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'aggregateYieldFeePercentage',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getCurrentLiveBalances',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'balancesLiveScaled18',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getECLPParams',
        outputs: [
            {
                components: [
                    { internalType: 'int256', name: 'alpha', type: 'int256' },
                    { internalType: 'int256', name: 'beta', type: 'int256' },
                    { internalType: 'int256', name: 'c', type: 'int256' },
                    { internalType: 'int256', name: 's', type: 'int256' },
                    { internalType: 'int256', name: 'lambda', type: 'int256' },
                ],
                internalType: 'struct IGyroECLPPool.EclpParams',
                name: 'params',
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
                    { internalType: 'int256', name: 'u', type: 'int256' },
                    { internalType: 'int256', name: 'v', type: 'int256' },
                    { internalType: 'int256', name: 'w', type: 'int256' },
                    { internalType: 'int256', name: 'z', type: 'int256' },
                    { internalType: 'int256', name: 'dSq', type: 'int256' },
                ],
                internalType: 'struct IGyroECLPPool.DerivedEclpParams',
                name: 'd',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getGyroECLPPoolDynamicData',
        outputs: [
            {
                components: [
                    {
                        internalType: 'uint256[]',
                        name: 'balancesLiveScaled18',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'tokenRates',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'staticSwapFeePercentage',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'totalSupply',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'bptRate',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bool',
                        name: 'isPoolInitialized',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'isPoolPaused',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'isPoolInRecoveryMode',
                        type: 'bool',
                    },
                ],
                internalType: 'struct GyroECLPPoolDynamicData',
                name: 'data',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getGyroECLPPoolImmutableData',
        outputs: [
            {
                components: [
                    {
                        internalType: 'contract IERC20[]',
                        name: 'tokens',
                        type: 'address[]',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'decimalScalingFactors',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'int256',
                        name: 'paramsAlpha',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'paramsBeta',
                        type: 'int256',
                    },
                    { internalType: 'int256', name: 'paramsC', type: 'int256' },
                    { internalType: 'int256', name: 'paramsS', type: 'int256' },
                    {
                        internalType: 'int256',
                        name: 'paramsLambda',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'tauAlphaX',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'tauAlphaY',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'tauBetaX',
                        type: 'int256',
                    },
                    {
                        internalType: 'int256',
                        name: 'tauBetaY',
                        type: 'int256',
                    },
                    { internalType: 'int256', name: 'u', type: 'int256' },
                    { internalType: 'int256', name: 'v', type: 'int256' },
                    { internalType: 'int256', name: 'w', type: 'int256' },
                    { internalType: 'int256', name: 'z', type: 'int256' },
                    { internalType: 'int256', name: 'dSq', type: 'int256' },
                ],
                internalType: 'struct GyroECLPPoolImmutableData',
                name: 'data',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getMaximumInvariantRatio',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getMaximumSwapFeePercentage',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getMinimumInvariantRatio',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getMinimumSwapFeePercentage',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getRate',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getStaticSwapFeePercentage',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getTokenInfo',
        outputs: [
            {
                internalType: 'contract IERC20[]',
                name: 'tokens',
                type: 'address[]',
            },
            {
                components: [
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
                internalType: 'struct TokenInfo[]',
                name: 'tokenInfo',
                type: 'tuple[]',
            },
            {
                internalType: 'uint256[]',
                name: 'balancesRaw',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'lastBalancesLiveScaled18',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getTokens',
        outputs: [
            {
                internalType: 'contract IERC20[]',
                name: 'tokens',
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
            { internalType: 'contract IVault', name: '', type: 'address' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'incrementNonce',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'name',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
        name: 'nonces',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
                    { internalType: 'bytes', name: 'userData', type: 'bytes' },
                ],
                internalType: 'struct PoolSwapParams',
                name: 'request',
                type: 'tuple',
            },
        ],
        name: 'onSwap',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
            { internalType: 'uint256', name: 'deadline', type: 'uint256' },
            { internalType: 'uint8', name: 'v', type: 'uint8' },
            { internalType: 'bytes32', name: 'r', type: 'bytes32' },
            { internalType: 'bytes32', name: 's', type: 'bytes32' },
        ],
        name: 'permit',
        outputs: [],
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
        inputs: [],
        name: 'symbol',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'from', type: 'address' },
            { internalType: 'address', name: 'to', type: 'address' },
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
] as const;
