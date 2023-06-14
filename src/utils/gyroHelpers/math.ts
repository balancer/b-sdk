import {
    SQRT_1E_NEG_1,
    SQRT_1E_NEG_3,
    SQRT_1E_NEG_5,
    SQRT_1E_NEG_7,
    SQRT_1E_NEG_9,
    SQRT_1E_NEG_11,
    SQRT_1E_NEG_13,
    SQRT_1E_NEG_15,
    SQRT_1E_NEG_17,
} from './constants';
import { MathSol, WAD } from '../math';

/////////
/// SQUARE ROOT
/////////

// TODO: is this generic enough so we're able to move to utils/math.ts?
export function sqrt(input: bigint, tolerance: bigint): bigint {
    if (input === 0n) {
        return 0n;
    }
    let guess = makeInitialGuess(input);

    // 7 iterations
    for (let i = 0; i < 7; i++) {
        guess = (guess + (input * WAD) / guess) / 2n;
    }

    // Check square is more or less correct (in some epsilon range)
    const guessSquared = (guess * guess) / WAD;
    if (
        !(
            guessSquared <= input + MathSol.mulUpFixed(guess, tolerance) &&
            guessSquared >= input - MathSol.mulUpFixed(guess, tolerance)
        )
    )
        throw new Error('GyroEPool: sqrt failed');

    return guess;
}

function makeInitialGuess(input: bigint) {
    if (input > WAD) {
        return 2n ** intLog2Halved(input / WAD) * WAD;
    } else {
        if (input <= 10n) {
            return SQRT_1E_NEG_17;
        }
        if (input <= 100n) {
            return 10000000000n;
        }
        if (input <= 1000n) {
            return SQRT_1E_NEG_15;
        }
        if (input <= 10000n) {
            return 100000000000n;
        }
        if (input <= 100000n) {
            return SQRT_1E_NEG_13;
        }
        if (input <= 1000000n) {
            return 1000000000000n;
        }
        if (input <= 10000000n) {
            return SQRT_1E_NEG_11;
        }
        if (input <= 100000000n) {
            return 10000000000000n;
        }
        if (input <= 1000000000n) {
            return SQRT_1E_NEG_9;
        }
        if (input <= 10000000000n) {
            return 100000000000000n;
        }
        if (input <= 100000000000n) {
            return SQRT_1E_NEG_7;
        }
        if (input <= 1000000000000n) {
            return 1000000000000000n;
        }
        if (input <= 10000000000000n) {
            return SQRT_1E_NEG_5;
        }
        if (input <= 100000000000000n) {
            return 10000000000000000n;
        }
        if (input <= 1000000000000000n) {
            return SQRT_1E_NEG_3;
        }
        if (input <= 10000000000000000n) {
            return 100000000000000000n;
        }
        if (input <= 100000000000000000n) {
            return SQRT_1E_NEG_1;
        }
        return input;
    }
}

function intLog2Halved(x: bigint) {
    let n = 0n;
    let _x = x;

    for (let i = 128n; i >= 2n; i = i / 2n) {
        const factor = 2n ** i;
        if (_x >= factor) {
            _x = _x / factor;
            n += i / 2n;
        }
    }

    return n;
}
