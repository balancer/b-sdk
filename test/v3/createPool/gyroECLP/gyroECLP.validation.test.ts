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
import {
    _MAX_STRETCH_FACTOR,
    _ONE,
    _ROTATION_VECTOR_NORM_ACCURACY,
} from 'src/entities/inputValidator/gyro/inputValidatorGyro';

const chainId = ChainId.SEPOLIA;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI;

describe('create GyroECLP pool input validations', () => {
    const createPool = new CreatePool();
    let createPoolInput: CreatePoolGyroECLPInput;
    beforeAll(async () => {
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
            {
                address: DAI.address,
                rateProvider: zeroAddress,
                tokenType: TokenType.STANDARD,
                paysYieldFees: false,
            },
        ];
        expect(() =>
            createPool.buildCall({ ...createPoolInput, tokens }),
        ).toThrowError('Duplicate token addresses');
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
        expect(() =>
            createPool.buildCall({ ...createPoolInput, tokens }),
        ).toThrowError(
            'Only TokenType.STANDARD is allowed to have zeroAddress rateProvider',
        );
    });

    describe('validateParams', () => {
        test('s outside valid range', async () => {
            expect(() =>
                createPool.buildCall({
                    ...createPoolInput,
                    eclpParams: {
                        ...createPoolInput.eclpParams,
                        s: -1n,
                    },
                }),
            ).toThrowError('EclpParams.s must be between 0 and 1e18');

            expect(() =>
                createPool.buildCall({
                    ...createPoolInput,
                    eclpParams: {
                        ...createPoolInput.eclpParams,
                        s: parseUnits('1', 18) + 1n,
                    },
                }),
            ).toThrowError('EclpParams.s must be between 0 and 1e18');
        });

        test('c outside valid range', async () => {
            expect(() =>
                createPool.buildCall({
                    ...createPoolInput,
                    eclpParams: {
                        ...createPoolInput.eclpParams,
                        c: -1n,
                    },
                }),
            ).toThrowError('EclpParams.c must be between 0 and 1e18');

            expect(() =>
                createPool.buildCall({
                    ...createPoolInput,
                    eclpParams: {
                        ...createPoolInput.eclpParams,
                        c: parseUnits('1', 18) + 1n,
                    },
                }),
            ).toThrowError('EclpParams.c must be between 0 and 1e18');
        });

        test('scnorm2 outside valid range', async () => {
            expect(() =>
                createPool.buildCall({
                    ...createPoolInput,
                    eclpParams: {
                        ...createPoolInput.eclpParams,
                        s: 1n,
                        c: 1n,
                    },
                }),
            ).toThrowError('Rotation Vector Not Normalized');

            expect(() =>
                createPool.buildCall({
                    ...createPoolInput,
                    eclpParams: {
                        ...createPoolInput.eclpParams,
                        s: parseUnits('1', 17),
                        c: parseUnits('1', 17),
                    },
                }),
            ).toThrowError('Rotation Vector Not Normalized');
        });

        test('lambda outside valid range', async () => {
            expect(() =>
                createPool.buildCall({
                    ...createPoolInput,
                    eclpParams: {
                        ...createPoolInput.eclpParams,
                        lambda: _MAX_STRETCH_FACTOR + 1n,
                    },
                }),
            ).toThrowError('Stretching Factor Wrong');
        });
    });
});
