// pnpm test -- createPool/gyroECLP/gyroECLP.validation.test.ts
import { zeroAddress, parseUnits } from 'viem';
import {
    ChainId,
    PoolType,
    TokenType,
    CreatePool,
    CreatePoolGyroECLPInput,
} from 'src';
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
            derivedEclpParams: {
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
            },
        };
    });

    // Helper function to modify input parameters succinctly
    const buildCallWithModifiedInput = (
        updates: Partial<
            Omit<CreatePoolGyroECLPInput, 'eclpParams' | 'derivedEclpParams'>
        > & {
            eclpParams?: Partial<CreatePoolGyroECLPInput['eclpParams']>;
            derivedEclpParams?: Partial<
                Omit<
                    CreatePoolGyroECLPInput['derivedEclpParams'],
                    'tauAlpha' | 'tauBeta'
                >
            > & {
                tauAlpha?: Partial<{ x: bigint; y: bigint }>;
                tauBeta?: Partial<{ x: bigint; y: bigint }>;
            };
        } = {},
    ) => {
        createPool.buildCall({
            ...createPoolInput,
            ...updates,
            eclpParams: {
                ...createPoolInput.eclpParams,
                ...updates.eclpParams,
            },
            derivedEclpParams: {
                ...createPoolInput.derivedEclpParams,
                ...updates.derivedEclpParams,
                tauAlpha: {
                    ...createPoolInput.derivedEclpParams.tauAlpha,
                    ...updates.derivedEclpParams?.tauAlpha,
                },
                tauBeta: {
                    ...createPoolInput.derivedEclpParams.tauBeta,
                    ...updates.derivedEclpParams?.tauBeta,
                },
            },
        });
    };

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
            'GyroECLP pools on v3 support only two tokens',
        );
    });

    describe('validateParams', () => {
        test('RotationVectorSWrong()', async () => {
            expect(() =>
                buildCallWithModifiedInput({ eclpParams: { s: -1n } }),
            ).toThrowError('s must be >= 0 and <= 1000000000000000000');

            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: { s: _ONE + 1n },
                }),
            ).toThrowError('s must be >= 0 and <= 1000000000000000000');
        });

        test('RotationVectorCWrong()', async () => {
            expect(() =>
                buildCallWithModifiedInput({ eclpParams: { c: -1n } }),
            ).toThrowError('c must be >= 0 and <= 1000000000000000000');

            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: { c: _ONE + 1n },
                }),
            ).toThrowError('c must be >= 0 and <= 1000000000000000000');
        });

        test('scnorm2 outside valid range', async () => {
            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: { s: 1n, c: 1n },
                }),
            ).toThrowError('RotationVectorNotNormalized');

            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: {
                        s: parseUnits('1', 18),
                        c: parseUnits('1', 18),
                    },
                }),
            ).toThrowError('RotationVectorNotNormalized');
        });

        test('lambda outside valid range', async () => {
            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: { lambda: -1n },
                }),
            ).toThrowError(
                'lambda must be >= 0 and <= 100000000000000000000000000',
            );

            expect(() =>
                buildCallWithModifiedInput({
                    eclpParams: { lambda: _MAX_STRETCH_FACTOR + 1n },
                }),
            ).toThrowError(
                'lambda must be >= 0 and <= 100000000000000000000000000',
            );
        });
    });

    describe('validateDerivedParamsLimits', () => {
        test('DerivedTauAlphaYWrong()', async () => {
            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: { tauAlpha: { y: -1n } },
                }),
            ).toThrowError('tuaAlpha.y must be > 0');
        });

        test('DerivedTauBetaYWrong()', async () => {
            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: { tauBeta: { y: -1n } },
                }),
            ).toThrowError('tauBeta.y must be > 0');
        });

        test('DerivedTauXWrong()', async () => {
            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: {
                        tauBeta: {
                            x: createPoolInput.derivedEclpParams.tauAlpha.x,
                        },
                    },
                }),
            ).toThrowError('tauBeta.x must be > tauAlpha.x');
        });

        test('DerivedTauAlphaNotNormalized()', async () => {
            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: {
                        tauAlpha: {
                            x: 0n,
                            y: _ONE_XP - _DERIVED_TAU_NORM_ACCURACY_XP - 1n,
                        },
                    },
                }),
            ).toThrowError('RotationVectorNotNormalized()');

            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: {
                        tauAlpha: {
                            x: 0n,
                            y: _ONE_XP + _DERIVED_TAU_NORM_ACCURACY_XP + 1n,
                        },
                    },
                }),
            ).toThrowError('RotationVectorNotNormalized()');
        });

        test('Derived parameters u, v, w, z limits', async () => {
            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: { u: _ONE_XP + 1n },
                }),
            ).toThrowError(`u must be <= ${_ONE_XP}`);

            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: { v: _ONE_XP + 1n },
                }),
            ).toThrowError(`v must be <= ${_ONE_XP}`);

            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: { w: _ONE_XP + 1n },
                }),
            ).toThrowError(`w must be <= ${_ONE_XP}`);

            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: { z: _ONE_XP + 1n },
                }),
            ).toThrowError(`z must be <= ${_ONE_XP}`);
        });

        test('DerivedDsqWrong()', async () => {
            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: {
                        dSq: _ONE_XP - _DERIVED_DSQ_NORM_ACCURACY_XP - 1n,
                    },
                }),
            ).toThrowError('DerivedDsqWrong()');

            expect(() =>
                buildCallWithModifiedInput({
                    derivedEclpParams: {
                        dSq: _ONE_XP + _DERIVED_DSQ_NORM_ACCURACY_XP + 1n,
                    },
                }),
            ).toThrowError('DerivedDsqWrong()');
        });
    });
});
