// https://github.com/balancer/balancer-v3-monorepo/blob/main/pvt/helpers/src/numbers.ts

import { Decimal } from 'decimal.js-light';
type BigNumberish = string | number | bigint;

const SCALING_FACTOR = 1e18;

export const decimal = (x: BigNumberish | Decimal): Decimal =>
    new Decimal(x.toString());

export const fp = (x: BigNumberish | Decimal): bigint => bn(toFp(x));

export const toFp = (x: BigNumberish | Decimal): Decimal =>
    decimal(x).mul(SCALING_FACTOR);

export const fromFp = (x: BigNumberish | Decimal): Decimal =>
    decimal(x).div(SCALING_FACTOR);

export const bn = (x: BigNumberish | Decimal): bigint => {
    if (typeof x === 'bigint') return x;
    const stringified = parseScientific(x.toString());
    const integer = stringified.split('.')[0];
    return BigInt(integer);
};

export const fpMulDown = (a: BigNumberish, b: BigNumberish): bigint =>
    (bn(a) * bn(b)) / FP_SCALING_FACTOR;

export const fpDivDown = (a: BigNumberish, b: BigNumberish): bigint =>
    (bn(a) * FP_SCALING_FACTOR) / bn(b);

const FP_SCALING_FACTOR = bn(SCALING_FACTOR);

function parseScientific(num: string): string {
    // If the number is not in scientific notation return it as it is
    if (!/\d+\.?\d*e[+-]*\d+/i.test(num)) return num;

    // Remove the sign
    const numberSign = Math.sign(Number(num));
    let absNum = Math.abs(Number(num)).toString();

    // Parse into coefficient and exponent
    const [coefficient, exponent] = absNum.toLowerCase().split('e');
    let zeros = Math.abs(Number(exponent));
    const exponentSign = Math.sign(Number(exponent));
    const [integer, decimals] = (
        coefficient.indexOf('.') !== -1 ? coefficient : `${coefficient}.`
    ).split('.');

    if (exponentSign === -1) {
        zeros -= integer.length;
        absNum =
            zeros < 0
                ? `${integer.slice(0, zeros)}.${integer.slice(
                      zeros,
                  )}${decimals}`
                : `0.${'0'.repeat(zeros)}${integer}${decimals}`;
    } else {
        if (decimals) zeros -= decimals.length;
        absNum =
            zeros < 0
                ? `${integer}${decimals.slice(0, zeros)}.${decimals.slice(
                      zeros,
                  )}`
                : `${integer}${decimals}${'0'.repeat(zeros)}`;
    }

    return numberSign < 0 ? `-${absNum}` : absNum;
}
