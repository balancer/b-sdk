// pnpm test -- gyroEMath.test.ts
import { formatEther, parseEther } from 'viem';
import { calculateDerivedValues } from '../src/entities/pools/gyroE/testingHelpers';
import { RawGyroEPool } from '../src/data/types';
import testPools from './lib/testData/gyroETestPool.json';
import { ChainId } from '../src/utils';
import { GyroEPool, Vector2 } from '../src/entities/pools/gyroE/gyroEPool';
import { Token, TokenAmount } from '../src/entities';
import { calculateInvariantWithError } from '../src/entities/pools/gyroE/gyroEMath';
import {
    virtualOffset0,
    virtualOffset1,
} from '../src/entities/pools/gyroE/gyroEMathHelpers';

const GYRO_E_PARAMS = {
    alpha: parseEther('0.050000000000020290'),
    beta: parseEther('0.397316269897841178'),
    c: parseEther('0.9551573261744535'),
    s: parseEther('0.29609877111408056'),
    lambda: parseEther('748956.475000000000000000'),
};

const DERIVED_GYRO_E_PARAMS = calculateDerivedValues(GYRO_E_PARAMS);

describe('gyroEMath tests', () => {
    const testPool = { ...testPools }.pools[0] as RawGyroEPool;
    const chainId = ChainId.GOERLI;
    const pool = GyroEPool.fromRawPool(chainId, testPool);
    const tokenIn = new Token(
        chainId,
        '0x2a7fa61d84db003a999bf4623942f235bff659a8',
        18,
        'MTK',
    );
    const tokenOut = new Token(
        chainId,
        '0x4ac0909d762f20dfee3efc6a5ce1029c78812648',
        18,
        'MTK2',
    );
    const { tIn, tOut } = pool.getRequiredTokenPair(tokenIn, tokenOut);

    describe('add and remove swap fee', () => {
        const amountIn = TokenAmount.fromHumanAmount(tokenIn, '28492.48453');
        test('should correctly add swap fee', async () => {
            const amountInWithFee = pool.addSwapFeeAmount(amountIn).amount;
            expect(Number(formatEther(amountInWithFee))).toBeCloseTo(
                31310.4225604,
                5,
            );
        });
        test('should correctly reduce by swap fee', async () => {
            const amountInLessFee = pool.subtractSwapFeeAmount(amountIn).amount;
            expect(Number(formatEther(amountInLessFee))).toBeCloseTo(
                25928.1609223,
                5,
            );
        });
    });

    describe('invariant', () => {
        test('should correctly calculate invariant', async () => {
            const [currentInvariant, invErr] = calculateInvariantWithError(
                [tIn.scale18, tOut.scale18],
                GYRO_E_PARAMS,
                DERIVED_GYRO_E_PARAMS,
            );

            expect(currentInvariant).toEqual(295358168772127n);
            expect(invErr).toEqual(2n);
        });
    });

    describe('calculate virtual parameters', () => {
        test('should correctly calculate virtual offset 0 (a)', async () => {
            const [currentInvariant, invErr] = calculateInvariantWithError(
                [tIn.scale18, tOut.scale18],
                GYRO_E_PARAMS,
                DERIVED_GYRO_E_PARAMS,
            );

            const invariant: Vector2 = {
                x: currentInvariant + invErr * 2n,
                y: currentInvariant,
            };

            const a = virtualOffset0(
                GYRO_E_PARAMS,
                DERIVED_GYRO_E_PARAMS,
                invariant,
            );
            expect(Number(formatEther(a))).toBeCloseTo(211.2907465218162, 5);
        });
    });

    describe('calculate virtual parameters', () => {
        test('should correctly calculate virtual offset 1 (b)', async () => {
            const [currentInvariant, invErr] = calculateInvariantWithError(
                [tIn.scale18, tOut.scale18],
                GYRO_E_PARAMS,
                DERIVED_GYRO_E_PARAMS,
            );

            const invariant: Vector2 = {
                x: currentInvariant + invErr * 2n,
                y: currentInvariant,
            };

            const b = virtualOffset1(
                GYRO_E_PARAMS,
                DERIVED_GYRO_E_PARAMS,
                invariant,
            );
            expect(Number(formatEther(b))).toBeCloseTo(65.50013143153841, 5);
        });
    });
});
