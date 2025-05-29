// pnpm test -- createPool/gyroECLP/gyroECLP.validation.test.ts
import { zeroAddress, parseUnits } from 'viem';
import {
    ChainId,
    PoolType,
    TokenType,
    CreatePool,
    CreatePoolGyroECLPInput,
    inputValidationError,
    DerivedEclpParams,
    CreatePoolGyroECLP,
} from 'src';
import { calcDerivedParams } from 'src/entities/createPool/createPoolV3/gyroECLP/createPoolGyroECLP';
import { TOKENS } from 'test/lib/utils/addresses';

import { GyroECLPMath } from '@balancer-labs/balancer-maths';

const {
    _ONE,
    _ONE_XP,
    _DERIVED_TAU_NORM_ACCURACY_XP,
    _DERIVED_DSQ_NORM_ACCURACY_XP,
    _MAX_STRETCH_FACTOR,
} = GyroECLPMath;

const chainId = ChainId.SEPOLIA;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI;
const USDC = TOKENS[chainId].USDC;

describe('create GyroECLP pool input validations', () => {
    const createPool = new CreatePool();
    let createPoolInput: CreatePoolGyroECLPInput;
    let derivedEclpParams: DerivedEclpParams;

    beforeAll(async () => {
        // Start with a valid input and modify individual params to expect errors
        createPoolInput = {
            poolType: PoolType.GyroE,
            symbol: '50BAL-50DAI',
            tokens: [
                {
                    address: BAL.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: DAI.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            swapFeePercentage: 10000000000000000n,
            poolHooksContract: zeroAddress,
            pauseManager: zeroAddress,
            swapFeeManager: zeroAddress,
            disableUnbalancedLiquidity: false,
            chainId,
            protocolVersion: 3,
            enableDonation: false,
            eclpParams: {
                alpha: 998502246630054917n,
                beta: 1000200040008001600n,
                c: 707106781186547524n,
                s: 707106781186547524n,
                lambda: 4000000000000000000000n,
            },
        };

        derivedEclpParams = calcDerivedParams(createPoolInput.eclpParams);
    });

    // Helper function to modify input parameters succinctly
    const buildCallWithModifiedInput = (
        updates: Partial<
            Omit<CreatePoolGyroECLPInput, 'eclpParams' | 'derivedEclpParams'>
        > & {
            eclpParams?: Partial<CreatePoolGyroECLPInput['eclpParams']>;
        } = {},
    ) => {
        createPool.buildCall({
            ...createPoolInput,
            ...updates,
            eclpParams: {
                ...createPoolInput.eclpParams,
                ...updates.eclpParams,
            },
        });
    };

    // Helper function to validate modified derived ECLP params (which should error out)
    const validateModifiedDerivedParams = (updates: any) => {
        const derivedEclpParams1 = {
            ...derivedEclpParams,
            ...updates,
            tauAlpha: {
                ...derivedEclpParams.tauAlpha,
                ...updates?.tauAlpha,
            },
            tauBeta: {
                ...derivedEclpParams.tauBeta,
                ...updates?.tauBeta,
            }
        };
        GyroECLPMath.validateDerivedParams(createPoolInput.eclpParams, derivedEclpParams1);
    }


    test('Duplicate token addresses, expects error', async () => {
        const tokens: CreatePoolGyroECLPInput['tokens'] = [
            {
                address: BAL.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: BAL.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
        ];
        expect(() => buildCallWithModifiedInput({ tokens })).toThrowError(
            'Duplicate token addresses',
        );
    });

    test('Allowing only TokenType.STANDARD to have address zero as rateProvider', async () => {
        const tokens: CreatePoolGyroECLPInput['tokens'] = [
            {
                address: BAL.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: DAI.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.ERC4626_TOKEN,
                paysYieldFees: false,
            },
        ];
        expect(() => buildCallWithModifiedInput({ tokens })).toThrowError(
            'Only TokenType.STANDARD is allowed to have zeroAddress rateProvider',
        );
    });

    test('Allows only two tokens', async () => {
        const tokens: CreatePoolGyroECLPInput['tokens'] = [
            {
                address: BAL.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: DAI.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
            {
                address: USDC.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
        ];
        expect(() => buildCallWithModifiedInput({ tokens })).toThrowError(
            inputValidationError(
                'Create Pool',
                'GyroECLP pools support only two tokens on Balancer v3',
            ),
        );
    });

    describe('Validate Base Params', () => {
        test('RotationVectorSWrong()', async () => {
            expect(() =>
                buildCallWithModifiedInput({ eclpParams: { s: -1n } }),
            ).toThrowError(
                inputValidationError(
                    'Create Pool',
                    'Invalid base ECLP parameters',
                    's must be >= 0 and <= 1000000000000000000',
                ),
            );

            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: { s: _ONE + 1n },
                }),
            ).toThrowError(
                inputValidationError(
                    'Create Pool',
                    'Invalid base ECLP parameters',
                    's must be >= 0 and <= 1000000000000000000',
                ),
            );
        });

        test('RotationVectorCWrong()', async () => {
            expect(() =>
                buildCallWithModifiedInput({ eclpParams: { c: -1n } }),
            ).toThrowError(
                inputValidationError(
                    'Create Pool',
                    'Invalid base ECLP parameters',
                    'c must be >= 0 and <= 1000000000000000000',
                ),
            );

            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: { c: _ONE + 1n },
                }),
            ).toThrowError(
                inputValidationError(
                    'Create Pool',
                    'Invalid base ECLP parameters',
                    'c must be >= 0 and <= 1000000000000000000',
                ),
            );
        });

        test('scnorm2 outside valid range', async () => {
            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: { s: 1n, c: 1n },
                }),
            ).toThrowError(
                inputValidationError(
                    'Create Pool',
                    'Invalid base ECLP parameters',
                    'RotationVectorNotNormalized()',
                ),
            );

            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: {
                        s: parseUnits('1', 18),
                        c: parseUnits('1', 18),
                    },
                }),
            ).toThrowError(
                inputValidationError(
                    'Create Pool',
                    'Invalid base ECLP parameters',
                    'RotationVectorNotNormalized()',
                ),
            );
        });

        test('lambda outside valid range', async () => {
            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: { lambda: -1n },
                }),
            ).toThrowError(
                inputValidationError(
                    'Create Pool',
                    'Invalid base ECLP parameters',
                    'lambda must be >= 0 and <= 100000000000000000000000000',
                ),
            );

            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: { lambda: _MAX_STRETCH_FACTOR + 1n },
                }),
            ).toThrowError(
                inputValidationError(
                    'Create Pool',
                    'Invalid base ECLP parameters',
                    'lambda must be >= 0 and <= 100000000000000000000000000',
                ),
            );
        });
    });

    // NB We have moved derived params calculation inside buildCall(), so this checks if GyroECLPMath.validateDerivedParams() actually validates anything right.
    describe('Validate Derived Params', () => {
        test('DerivedTauAlphaYWrong()', async () => {
            expect(() =>
                validateModifiedDerivedParams({ tauAlpha: { y: -1n } })
            ).toThrowError(
                'tuaAlpha.y must be > 0',
            );
        });

        test('DerivedTauBetaYWrong()', async () => {
            expect(() =>
                validateModifiedDerivedParams({ tauBeta: { y: -1n } })
            ).toThrowError(
                'tauBeta.y must be > 0',
            );
        });

        test('DerivedTauXWrong()', async () => {
            expect(() =>
                validateModifiedDerivedParams({
                        tauBeta: {
                            x: derivedEclpParams.tauAlpha.x,
                        },
                    })
            ).toThrowError(
                'tauBeta.x must be > tauAlpha.x',
            );
        });

        test('DerivedTauAlphaNotNormalized()', async () => {
            expect(() =>
                validateModifiedDerivedParams({
                        tauAlpha: {
                            x: 0n,
                            y: _ONE_XP - _DERIVED_TAU_NORM_ACCURACY_XP - 1n,
                        },
                    })
            ).toThrowError(
                'RotationVectorNotNormalized()',
            );

            expect(() =>
                validateModifiedDerivedParams({
                        tauAlpha: {
                            x: 0n,
                            y: _ONE_XP + _DERIVED_TAU_NORM_ACCURACY_XP + 1n,
                        },
                }),
            ).toThrowError(
                'RotationVectorNotNormalized()',
            );
        });

        test('Derived parameters u, v, w, z limits', async () => {
            expect(() =>
                validateModifiedDerivedParams({ u: _ONE_XP + 1n })
            ).toThrowError(
                `u must be <= ${_ONE_XP}`,
            );

            expect(() =>
                validateModifiedDerivedParams({ v: _ONE_XP + 1n })
            ).toThrowError(
                `v must be <= ${_ONE_XP}`,
            );

            expect(() =>
                validateModifiedDerivedParams({ w: _ONE_XP + 1n })
            ).toThrowError(
                `w must be <= ${_ONE_XP}`,
            );

            expect(() =>
                validateModifiedDerivedParams({ z: _ONE_XP + 1n })
            ).toThrowError(
                `z must be <= ${_ONE_XP}`,
            );
        });

        test('DerivedDsqWrong()', async () => {
            expect(() =>
                validateModifiedDerivedParams({
                        dSq: _ONE_XP - _DERIVED_DSQ_NORM_ACCURACY_XP - 1n,
                    })
            ).toThrowError(
                'DerivedDsqWrong()',
            );

            expect(() =>
                validateModifiedDerivedParams({
                        dSq: _ONE_XP + _DERIVED_DSQ_NORM_ACCURACY_XP + 1n,
                    })
            ).toThrowError(
                'DerivedDsqWrong()',
            );
        });
    });

    test('Derived params match expectation', async () => {
        expect(derivedEclpParams).to.deep.equal({
                tauAlpha: {
                    x: -94861212813096057289512505574275160547n,
                    y: 31644119574235279926451292677567331630n,
                },
                tauBeta: {
                    x: 37142269533113549537591131345643981951n,
                    y: 92846388265400743995957747409218517601n,
                },
                u: 66001741173104803338721745994955553010n,
                v: 62245253919818011890633399060291020887n,
                w: 30601134345582732000058913853921008022n,
                z: -28859471639991253843240999485797747790n,
                dSq: 99999999999999999886624093342106115200n,
            });
    });
});
