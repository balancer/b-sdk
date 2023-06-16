import { MathGyro, ONE, ONE_XP } from '../../../utils/gyroHelpers/math';
import { QParams, virtualOffset0, virtualOffset1 } from './gyroEMathHelpers';
import { calcXpXpDivLambdaLambda } from './gyroEMathHelpers';
import { DerivedGyroEParams, GyroEParams, Vector2 } from './gyroEPool';

/////////
/// SPOT PRICE AFTER SWAP CALCULATIONS
/////////

export function calcSpotPriceYGivenX(
    x: bigint,
    params: GyroEParams,
    d: DerivedGyroEParams,
    r: Vector2,
): bigint {
    const ab: Vector2 = {
        x: virtualOffset0(params, d, r),
        y: virtualOffset1(params, d, r),
    };
    const newSpotPriceFactor = solveDerivativeQuadraticSwap(
        params.lambda,
        x,
        params.s,
        params.c,
        r,
        ab,
        d.tauBeta,
        d.dSq,
    );
    return newSpotPriceFactor;
}

export function calcSpotPriceXGivenY(
    y: bigint,
    params: GyroEParams,
    d: DerivedGyroEParams,
    r: Vector2,
): bigint {
    const ba: Vector2 = {
        x: virtualOffset1(params, d, r),
        y: virtualOffset0(params, d, r),
    };
    const newSpotPriceFactor = solveDerivativeQuadraticSwap(
        params.lambda,
        y,
        params.c,
        params.s,
        r,
        ba,
        {
            x: d.tauAlpha.x * -1n,
            y: d.tauAlpha.y,
        },
        d.dSq,
    );
    return newSpotPriceFactor;
}

function solveDerivativeQuadraticSwap(
    lambda: bigint,
    x: bigint,
    s: bigint,
    c: bigint,
    r: Vector2,
    ab: Vector2,
    tauBeta: Vector2,
    dSq: bigint,
): bigint {
    const lamBar: Vector2 = {
        x:
            ONE_XP -
            MathGyro.divDownMagU(MathGyro.divDownMagU(ONE_XP, lambda), lambda),
        y:
            ONE_XP -
            MathGyro.divUpMagU(MathGyro.divUpMagU(ONE_XP, lambda), lambda),
    };
    const q: QParams = {
        a: 0n,
        b: 0n,
        c: 0n,
    };
    const xp = x - ab.x;
    q.b = MathGyro.mulUpXpToNpU(
        MathGyro.mulDownMagU(s, c),
        MathGyro.divXpU(lamBar.y, dSq),
    );

    const sTerm: Vector2 = {
        x: MathGyro.divXpU(
            MathGyro.mulDownMagU(MathGyro.mulDownMagU(lamBar.y, s), s),
            dSq,
        ),
        y:
            MathGyro.divXpU(
                MathGyro.mulUpMagU(MathGyro.mulUpMagU(lamBar.x, s), s),
                dSq + 1n,
            ) + 1n,
    };
    sTerm.x = ONE_XP - sTerm.x;
    sTerm.y = ONE_XP - sTerm.y;

    q.c = calcXpXpDivLambdaLambda(x, r, lambda, s, c, tauBeta, dSq) * -1n;
    q.c =
        q.c + MathGyro.mulDownXpToNpU(MathGyro.mulDownMagU(r.y, r.y), sTerm.y); // r.y ===  currentInv + err
    q.c = q.c > 0n ? MathGyro.sqrt(q.c, 5n) : 0n;

    q.c = MathGyro.mulDown(MathGyro.mulDown(q.c, lambda), lambda);
    q.c = MathGyro.divDown(xp, q.c);

    if (q.b - q.c > 0n) {
        q.a = MathGyro.mulUpXpToNpU(
            q.b - q.c,
            MathGyro.divXpU(ONE_XP, sTerm.y) + 1n,
        );
    } else {
        q.a = MathGyro.mulUpXpToNpU(
            q.b - q.c,
            MathGyro.divXpU(ONE_XP, sTerm.x),
        );
    }
    return q.a;
}

/////////
/// SPOT PRICE DERIVATIVE CALCULATIONS
/////////

function setup(
    balances,
    params: GyroEParams,
    derived: DerivedGyroEParams,
    fee: bigint,
    rVec: Vector2,
    ixVar: number,
) {
    const r = rVec.y;
    const { c, s, lambda } = params;
    const [x0, y0] = balances;
    const a = virtualOffset0(params, derived, rVec);
    const b = virtualOffset1(params, derived, rVec);
    const ls = ONE - MathGyro.divDown(ONE, MathGyro.mulDown(lambda, lambda));
    const f = ONE - fee;

    let R: bigint;
    if (ixVar === 0) {
        R = MathGyro.sqrt(
            MathGyro.mulDown(
                MathGyro.mulDown(r, r),
                ONE - MathGyro.mulDown(ls, MathGyro.mulDown(s, s)),
            ) -
                MathGyro.divDown(
                    MathGyro.mulDown(x0 - a, x0 - a),
                    MathGyro.mulDown(lambda, lambda),
                ),
            5n,
        );
    } else {
        R = MathGyro.sqrt(
            MathGyro.mulDown(
                MathGyro.mulDown(r, r),
                ONE - MathGyro.mulDown(ls, MathGyro.mulDown(c, c)),
            ) -
                MathGyro.divDown(
                    MathGyro.mulDown(y0 - b, y0 - b),
                    MathGyro.mulDown(lambda, lambda),
                ),
            5n,
        );
    }

    return { x0, y0, c, s, lambda, a, b, ls, f, r, R };
}

export function normalizedLiquidityYIn(
    balances: bigint[],
    params: GyroEParams,
    derived: DerivedGyroEParams,
    fee: bigint,
    rVec: Vector2,
): bigint {
    const { y0, c, s, lambda, b, ls, R } = setup(
        balances,
        params,
        derived,
        fee,
        rVec,
        1,
    );

    const returnValue = MathGyro.divDown(
        MathGyro.mulDown(
            MathGyro.divDown(
                ONE,
                ONE - MathGyro.mulDown(ls, MathGyro.mulDown(c, c)),
            ),
            MathGyro.mulDown(
                R,
                MathGyro.mulDown(
                    MathGyro.mulDown(
                        MathGyro.mulDown(
                            MathGyro.mulDown(MathGyro.mulDown(ls, s), c),
                            MathGyro.mulDown(lambda, lambda),
                        ),
                        R,
                    ) -
                        (y0 - b),
                    MathGyro.mulDown(
                        MathGyro.mulDown(
                            MathGyro.mulDown(MathGyro.mulDown(ls, s), c),
                            MathGyro.mulDown(lambda, lambda),
                        ),
                        R,
                    ) -
                        (y0 - b),
                ),
            ),
        ),
        MathGyro.mulDown(
            MathGyro.mulDown(lambda, lambda),
            MathGyro.mulDown(R, R),
        ) + MathGyro.mulDown(y0 - b, y0 - b),
    );

    return returnValue;
}

export function normalizedLiquidityXIn(
    balances: bigint[],
    params: GyroEParams,
    derived: DerivedGyroEParams,
    fee: bigint,
    rVec: Vector2,
): bigint {
    const { x0, c, s, lambda, a, ls, R } = setup(
        balances,
        params,
        derived,
        fee,
        rVec,
        0,
    );

    const returnValue = MathGyro.divDown(
        MathGyro.mulDown(
            MathGyro.divDown(
                ONE,
                ONE - MathGyro.mulDown(ls, MathGyro.mulDown(s, s)),
            ),
            MathGyro.mulDown(
                R,
                MathGyro.mulDown(
                    MathGyro.mulDown(
                        MathGyro.mulDown(
                            MathGyro.mulDown(MathGyro.mulDown(ls, s), c),
                            MathGyro.mulDown(lambda, lambda),
                        ),
                        R,
                    ) -
                        (x0 - a),
                    MathGyro.mulDown(
                        MathGyro.mulDown(
                            MathGyro.mulDown(MathGyro.mulDown(ls, s), c),
                            MathGyro.mulDown(lambda, lambda),
                        ),
                        R,
                    ) -
                        (x0 - a),
                ),
            ),
        ),
        MathGyro.mulDown(
            MathGyro.mulDown(lambda, lambda),
            MathGyro.mulDown(R, R),
        ) + MathGyro.mulDown(x0 - a, x0 - a),
    );

    return returnValue;
}

export function dPyDXIn(
    balances: bigint[],
    params: GyroEParams,
    derived: DerivedGyroEParams,
    fee: bigint,
    rVec: Vector2,
): bigint {
    const { x0, c, s, lambda, a, ls, R } = setup(
        balances,
        params,
        derived,
        fee,
        rVec,
        0,
    );

    const returnValue = MathGyro.divDown(
        MathGyro.mulDown(
            ONE - MathGyro.mulDown(ls, MathGyro.mulDown(s, s)),
            MathGyro.divDown(
                ONE,
                MathGyro.mulDown(MathGyro.mulDown(lambda, lambda), R),
            ) +
                MathGyro.divDown(
                    MathGyro.mulDown(x0 - a, x0 - a),
                    MathGyro.mulDown(
                        MathGyro.mulDown(
                            MathGyro.mulDown(lambda, lambda),
                            MathGyro.mulDown(lambda, lambda),
                        ),
                        MathGyro.mulDown(R, MathGyro.mulDown(R, R)),
                    ),
                ),
        ),
        MathGyro.mulDown(
            MathGyro.mulDown(MathGyro.mulDown(ls, s), c) -
                MathGyro.divDown(
                    x0 - a,
                    MathGyro.mulDown(MathGyro.mulDown(lambda, lambda), R),
                ),
            MathGyro.mulDown(MathGyro.mulDown(ls, s), c) -
                MathGyro.divDown(
                    x0 - a,
                    MathGyro.mulDown(MathGyro.mulDown(lambda, lambda), R),
                ),
        ),
    );

    return returnValue;
}

export function dPxDYIn(
    balances: bigint[],
    params: GyroEParams,
    derived: DerivedGyroEParams,
    fee: bigint,
    rVec: Vector2,
): bigint {
    const { y0, c, s, lambda, b, ls, R } = setup(
        balances,
        params,
        derived,
        fee,
        rVec,
        1,
    );

    const returnValue = MathGyro.divDown(
        MathGyro.mulDown(
            ONE - MathGyro.mulDown(ls, MathGyro.mulDown(c, c)),
            MathGyro.divDown(
                ONE,
                MathGyro.mulDown(MathGyro.mulDown(lambda, lambda), R),
            ) +
                MathGyro.divDown(
                    MathGyro.mulDown(y0 - b, y0 - b),
                    MathGyro.mulDown(
                        MathGyro.mulDown(
                            MathGyro.mulDown(lambda, lambda),
                            MathGyro.mulDown(lambda, lambda),
                        ),
                        MathGyro.mulDown(R, MathGyro.mulDown(R, R)),
                    ),
                ),
        ),
        MathGyro.mulDown(
            MathGyro.mulDown(MathGyro.mulDown(ls, s), c) -
                MathGyro.divDown(
                    y0 - b,
                    MathGyro.mulDown(MathGyro.mulDown(lambda, lambda), R),
                ),
            MathGyro.mulDown(MathGyro.mulDown(ls, s), c) -
                MathGyro.divDown(
                    y0 - b,
                    MathGyro.mulDown(MathGyro.mulDown(lambda, lambda), R),
                ),
        ),
    );

    return returnValue;
}

export function dPxDXOut(
    balances: bigint[],
    params: GyroEParams,
    derived: DerivedGyroEParams,
    fee: bigint,
    rVec: Vector2,
): bigint {
    const { x0, s, lambda, a, ls, R, f } = setup(
        balances,
        params,
        derived,
        fee,
        rVec,
        0,
    );

    const returnValue = MathGyro.mulDown(
        MathGyro.divDown(
            ONE,
            MathGyro.mulDown(
                f,
                ONE - MathGyro.mulDown(ls, MathGyro.mulDown(s, s)),
            ),
        ),
        MathGyro.divDown(
            ONE,
            MathGyro.mulDown(MathGyro.mulDown(lambda, lambda), R),
        ) +
            MathGyro.divDown(
                MathGyro.mulDown(x0 - a, x0 - a),
                MathGyro.mulDown(
                    MathGyro.mulDown(
                        MathGyro.mulDown(lambda, lambda),
                        MathGyro.mulDown(lambda, lambda),
                    ),
                    MathGyro.mulDown(MathGyro.mulDown(R, R), R),
                ),
            ),
    );

    return returnValue;
}

export function dPyDYOut(
    balances: bigint[],
    params: GyroEParams,
    derived: DerivedGyroEParams,
    fee: bigint,
    rVec: Vector2,
): bigint {
    const { y0, c, lambda, b, ls, R, f } = setup(
        balances,
        params,
        derived,
        fee,
        rVec,
        1,
    );

    const returnValue = MathGyro.mulDown(
        MathGyro.divDown(
            ONE,
            MathGyro.mulDown(
                f,
                ONE - MathGyro.mulDown(ls, MathGyro.mulDown(c, c)),
            ),
        ),
        MathGyro.divDown(
            ONE,
            MathGyro.mulDown(MathGyro.mulDown(lambda, lambda), R),
        ) +
            MathGyro.divDown(
                MathGyro.mulDown(y0 - b, y0 - b),
                MathGyro.mulDown(
                    MathGyro.mulDown(
                        MathGyro.mulDown(lambda, lambda),
                        MathGyro.mulDown(lambda, lambda),
                    ),
                    MathGyro.mulDown(MathGyro.mulDown(R, R), R),
                ),
            ),
    );

    return returnValue;
}
