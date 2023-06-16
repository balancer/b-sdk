import { parseUnits } from 'viem';
import { DerivedGyroEParams, GyroEParams } from './gyroEPool';

const ONE_100 = parseUnits('1', 100);

export function calculateDerivedValues(p: GyroEParams): DerivedGyroEParams {
    let { alpha, beta, s, c, lambda } = p;
    [alpha, beta, s, c, lambda] = [alpha, beta, s, c, lambda].map((bn) =>
        scale(bn, 18, 100),
    );

    const dSq = mul100(c, c) + mul100(s, s);
    const d = sqrtArbitraryDecimal(dSq, 100);

    const cOverDPlusAlphaOverSD = div100(c, d) + div100(mul100(alpha, s), d);
    const lambdaSquared = mul100(lambda, lambda);
    const alphaCOverDMinusSOverD = div100(mul100(alpha, c), d) - div100(s, d);

    const dAlpha = div100(
        ONE_100,
        sqrtArbitraryDecimal(
            div100(
                mul100(cOverDPlusAlphaOverSD, cOverDPlusAlphaOverSD),
                lambdaSquared,
            ) + mul100(alphaCOverDMinusSOverD, alphaCOverDMinusSOverD),
            100,
        ),
    );

    const cOverDPlusBetaSOverD = div100(c, d) + div100(mul100(beta, s), d);
    const betaCOverDMinusSOverD = div100(mul100(beta, c), d) - div100(s, d);

    const dBeta = div100(
        ONE_100,
        sqrtArbitraryDecimal(
            div100(
                mul100(cOverDPlusBetaSOverD, cOverDPlusBetaSOverD),
                lambdaSquared,
            ) + mul100(betaCOverDMinusSOverD, betaCOverDMinusSOverD),
            100,
        ),
    );

    const tauAlpha: bigint[] = [];
    tauAlpha.push(mul100(mul100(alpha, c) - s, dAlpha));
    tauAlpha.push(mul100(c + mul100(s, alpha), div100(dAlpha, lambda)));

    const tauBeta: bigint[] = [];

    tauBeta.push(mul100(mul100(beta, c) - s, dBeta));
    tauBeta.push(mul100(c + mul100(s, beta), div100(dBeta, lambda)));

    const w = mul100(mul100(s, c), tauBeta[1] - tauAlpha[1]);
    const z =
        mul100(mul100(c, c), tauBeta[0]) + mul100(mul100(s, s), tauAlpha[0]);
    const u = mul100(mul100(s, c), tauBeta[0] - tauAlpha[0]);
    const v =
        mul100(mul100(s, s), tauBeta[1]) + mul100(mul100(c, c), tauAlpha[1]);

    const derived = {
        tauAlpha: {
            x: scale(tauAlpha[0], 100, 38),
            y: scale(tauAlpha[1], 100, 38),
        },
        tauBeta: {
            x: scale(tauBeta[0], 100, 38),
            y: scale(tauBeta[1], 100, 38),
        },
        u: scale(u, 100, 38),
        v: scale(v, 100, 38),
        w: scale(w, 100, 38),
        z: scale(z, 100, 38),
        dSq: scale(dSq, 100, 38),
    };

    return derived;
}

function scale(bn: bigint, decimalsIn: number, decimalsOut: number) {
    return (bn * parseUnits('1', decimalsOut)) / parseUnits('1', decimalsIn);
}

export function sqrtArbitraryDecimal(input: bigint, decimals: number): bigint {
    if (input === 0n) {
        return 0n;
    }
    let guess = input > parseUnits('1', decimals) ? input / 2n : input;

    for (let i = 0; i < 100; i++) {
        guess = (guess + (input * parseUnits('1', decimals)) / guess) / 2n;
    }

    return guess;
}

function mul100(x: bigint, y: bigint) {
    return (x * y) / ONE_100;
}
function div100(x: bigint, y: bigint) {
    return (x * ONE_100) / y;
}
