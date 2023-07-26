export const WAD = 1000000000000000000n;
export const RAY = 1000000000000000000000000000000000000n;

export const TWO_WAD = 2000000000000000000n;
export const FOUR_WAD = 4000000000000000000n;
export const HUNDRED_WAD = 100000000000000000000n;

export const abs = (n: bigint): bigint => (n < 0n ? -n : n);

const _require = (b: boolean, message: string) => {
    if (!b) throw new Error(message);
};

export class MathSol {
    static max(a: bigint, b: bigint): bigint {
        return a >= b ? a : b;
    }

    static min(a: bigint, b: bigint): bigint {
        return a < b ? a : b;
    }

    static MAX_POW_RELATIVE_ERROR = 10000n;

    static mulDownFixed(a: bigint, b: bigint): bigint {
        const product = a * b;
        return product / WAD;
    }

    static mulUpFixed(a: bigint, b: bigint): bigint {
        const product = a * b;

        if (product === 0n) {
            return 0n;
        } else {
            return (product - 1n) / WAD + 1n;
        }
    }

    static divDownFixed(a: bigint, b: bigint): bigint {
        if (a === 0n) {
            return 0n;
        } else {
            const aInflated = a * WAD;
            return aInflated / b;
        }
    }

    static divUpFixed(a: bigint, b: bigint): bigint {
        if (a === 0n) {
            return 0n;
        } else {
            const aInflated = a * WAD;
            return (aInflated - 1n) / b + 1n;
        }
    }

    static divUp(a: bigint, b: bigint): bigint {
        if (a === 0n) {
            return 0n;
        } else {
            return 1n + (a - 1n) / b;
        }
    }

    // version = poolTypeVersion
    static powUpFixed(x: bigint, y: bigint, version?: number): bigint {
        if (y === WAD && version !== 1) {
            return x;
        } else if (y === TWO_WAD && version !== 1) {
            return this.mulUpFixed(x, x);
        } else if (y === FOUR_WAD && version !== 1) {
            const square = this.mulUpFixed(x, x);
            return this.mulUpFixed(square, square);
        } else {
            const raw = LogExpMath.pow(x, y);
            const maxError =
                this.mulUpFixed(raw, this.MAX_POW_RELATIVE_ERROR) + 1n;
            return raw + maxError;
        }
    }

    // version = poolTypeVersion
    static powDownFixed(x: bigint, y: bigint, version?: number): bigint {
        if (y === WAD && version !== 1) {
            return x;
        } else if (y === TWO_WAD && version !== 1) {
            return this.mulUpFixed(x, x);
        } else if (y === FOUR_WAD && version !== 1) {
            const square = this.mulUpFixed(x, x);
            return this.mulUpFixed(square, square);
        } else {
            const raw = LogExpMath.pow(x, y);
            const maxError =
                this.mulUpFixed(raw, this.MAX_POW_RELATIVE_ERROR) + 1n;
            if (raw < maxError) {
                return 0n;
            } else {
                return raw - maxError;
            }
        }
    }

    static complementFixed(x: bigint): bigint {
        return x < WAD ? WAD - x : 0n;
    }
}

class LogExpMath {
    // All fixed point multiplications and divisions are inlined. This means we need to divide by ONE when multiplying
    // two numbers, and multiply by ONE when dividing them.

    // The domain of natural exponentiation is bound by the word size and number of decimals used.
    //
    // Because internally the result will be stored using 20 decimals, the largest possible result is
    // (2^255 - 1) / 10^20, which makes the largest exponent ln((2^255 - 1) / 10^20) = 130.700829182905140221.
    // The smallest possible result is 10^(-18), which makes largest negative argument
    // ln(10^(-18)) = -41.446531673892822312.
    // We use 130.0 and -41.0 to have some safety margin.
    static MAX_NATURAL_EXPONENT = 130000000000000000000n;
    static MIN_NATURAL_EXPONENT = -41000000000000000000n;

    // Bounds for ln_36's argument. Both ln(0.9) and ln(1.1) can be represented with 36 decimal places in a fixed point
    // 256 bit integer.
    static LN_36_LOWER_BOUND: bigint = WAD - 100000000000000000n;
    static LN_36_UPPER_BOUND: bigint = WAD + 100000000000000000n;

    // static MILD_EXPONENT_BOUND: bigint = 2 ** 254 / HUNDRED_WAD;
    // Precomputed value of the above expression
    static MILD_EXPONENT_BOUND =
        289480223093290488558927462521719769633174961664101410098n;

    // 18 decimal constants
    static x0 = 128000000000000000000n; // 2ˆ7
    static a0 = 38877084059945950922200000000000000000000000000000000000n; // eˆ(x0) (no decimals)
    static x1 = 64000000000000000000n; // 2ˆ6
    static a1 = 6235149080811616882910000000n; // eˆ(x1) (no decimals)

    // 20 decimal constants
    static x2 = 3200000000000000000000n; // 2ˆ5
    static a2 = 7896296018268069516100000000000000n; // eˆ(x2)
    static x3 = 1600000000000000000000n; // 2ˆ4
    static a3 = 888611052050787263676000000n; // eˆ(x3)
    static x4 = 800000000000000000000n; // 2ˆ3
    static a4 = 298095798704172827474000n; // eˆ(x4)
    static x5 = 400000000000000000000n; // 2ˆ2
    static a5 = 5459815003314423907810n; // eˆ(x5)
    static x6 = 200000000000000000000n; // 2ˆ1
    static a6 = 738905609893065022723n; // eˆ(x6)
    static x7 = 100000000000000000000n; // 2ˆ0
    static a7 = 271828182845904523536n; // eˆ(x7)
    static x8 = 50000000000000000000n; // 2ˆ-1
    static a8 = 164872127070012814685n; // eˆ(x8)
    static x9 = 25000000000000000000n; // 2ˆ-2
    static a9 = 128402541668774148407n; // eˆ(x9)
    static x10 = 12500000000000000000n; // 2ˆ-3
    static a10 = 113314845306682631683n; // eˆ(x10)
    static x11 = 6250000000000000000n; // 2ˆ-4
    static a11 = 106449445891785942956n; // eˆ(x11)

    // All arguments and return values are 18 decimal fixed point numbers.
    static pow(x: bigint, y: bigint): bigint {
        if (y === 0n) {
            // We solve the 0^0 indetermination by making it equal one.
            return WAD;
        }

        if (x === 0n) {
            return 0n;
        }

        // Instead of computing x^y directly, we instead rely on the properties of logarithms and exponentiation to
        // arrive at that result. In particular, exp(ln(x)) = x, and ln(x^y) = y * ln(x). This means
        // x^y = exp(y * ln(x)).

        // The ln function takes a signed value, so we need to make sure x fits in the signed 256 bit range.
        _require(
            x <
                57896044618658097711785492504343953926634992332820282019728792003956564819968n,

            'Errors.X_OUT_OF_BOUNDS',
        );
        const x_int256 = x;

        // We will compute y * ln(x) in a single step. Depending on the value of x, we can either use ln or ln_36. In
        // both cases, we leave the division by ONE_18 (due to fixed point multiplication) to the end.

        // This prevents y * ln(x) from overflowing, and at the same time guarantees y fits in the signed 256 bit range.
        _require(y < this.MILD_EXPONENT_BOUND, 'Errors.Y_OUT_OF_BOUNDS');
        const y_int256 = y;

        let logx_times_y;
        if (
            this.LN_36_LOWER_BOUND < x_int256 &&
            x_int256 < this.LN_36_UPPER_BOUND
        ) {
            const ln_36_x = this._ln_36(x_int256);

            // ln_36_x has 36 decimal places, so multiplying by y_int256 isn't as straightforward, since we can't just
            // bring y_int256 to 36 decimal places, as it might overflow. Instead, we perform two 18 decimal
            // multiplications and add the results: one with the first 18 decimals of ln_36_x, and one with the
            // (downscaled) last 18 decimals.
            logx_times_y =
                (ln_36_x / WAD) * y_int256 + ((ln_36_x % WAD) * y_int256) / WAD;
        } else {
            logx_times_y = this._ln(x_int256) * y_int256;
        }
        logx_times_y /= WAD;

        // Finally, we compute exp(y * ln(x)) to arrive at x^y
        _require(
            this.MIN_NATURAL_EXPONENT <= logx_times_y &&
                logx_times_y <= this.MAX_NATURAL_EXPONENT,
            'Errors.PRODUCT_OUT_OF_BOUNDS',
        );

        // return uint256(exp(logx_times_y));
        return this.exp(logx_times_y);
    }

    static exp(x_: bigint): bigint {
        let x = x_;
        _require(
            x >= this.MIN_NATURAL_EXPONENT && x <= this.MAX_NATURAL_EXPONENT,
            'Errors.INVALID_EXPONENT',
        );

        if (x < 0) {
            // We only handle positive exponents: e^(-x) is computed as 1 / e^x. We can safely make x positive since it
            // fits in the signed 256 bit range (as it is larger than MIN_NATURAL_EXPONENT).
            // Fixed point division requires multiplying by ONE_18.
            return (WAD * WAD) / this.exp(-1n * x);
        }

        // First, we use the fact that e^(x+y) = e^x * e^y to decompose x into a sum of powers of two, which we call x_n,
        // where x_n == 2^(7 - n), and e^x_n = a_n has been precomputed. We choose the first x_n, x0, to equal 2^7
        // because all larger powers are larger than MAX_NATURAL_EXPONENT, and therefore not present in the
        // decomposition.
        // At the end of this process we will have the product of all e^x_n = a_n that apply, and the remainder of this
        // decomposition, which will be lower than the smallest x_n.
        // exp(x) = k_0 * a_0 * k_1 * a_1 * ... + k_n * a_n * exp(remainder), where each k_n equals either 0 or 1.
        // We mutate x by subtracting x_n, making it the remainder of the decomposition.

        // The first two a_n (e^(2^7) and e^(2^6)) are too large if stored as 18 decimal numbers, and could cause
        // intermediate overflows. Instead we store them as plain integers, with 0 decimals.
        // Additionally, x0 + x1 is larger than MAX_NATURAL_EXPONENT, which means they will not both be present in the
        // decomposition.

        // For each x_n, we test if that term is present in the decomposition (if x is larger than it), and if so deduct
        // it and compute the accumulated product.

        let firstAN: bigint;
        if (x >= this.x0) {
            x -= this.x0;
            firstAN = this.a0;
        } else if (x >= this.x1) {
            x -= this.x1;
            firstAN = this.a1;
        } else {
            firstAN = 1n;
        }

        // We now transform x into a 20 decimal fixed point number, to have enhanced precision when computing the
        // smaller terms.
        x *= 100n;

        // `product` is the accumulated product of all a_n (except a0 and a1), which starts at 20 decimal fixed point
        // one. Recall that fixed point multiplication requires dividing by ONE_20.
        let product = HUNDRED_WAD;

        if (x >= this.x2) {
            x -= this.x2;
            product = (product * this.a2) / HUNDRED_WAD;
        }
        if (x >= this.x3) {
            x -= this.x3;
            product = (product * this.a3) / HUNDRED_WAD;
        }
        if (x >= this.x4) {
            x -= this.x4;
            product = (product * this.a4) / HUNDRED_WAD;
        }
        if (x >= this.x5) {
            x -= this.x5;
            product = (product * this.a5) / HUNDRED_WAD;
        }
        if (x >= this.x6) {
            x -= this.x6;
            product = (product * this.a6) / HUNDRED_WAD;
        }
        if (x >= this.x7) {
            x -= this.x7;
            product = (product * this.a7) / HUNDRED_WAD;
        }
        if (x >= this.x8) {
            x -= this.x8;
            product = (product * this.a8) / HUNDRED_WAD;
        }
        if (x >= this.x9) {
            x -= this.x9;
            product = (product * this.a9) / HUNDRED_WAD;
        }

        // x10 and x11 are unnecessary here since we have high enough precision already.

        // Now we need to compute e^x, where x is small (in particular, it is smaller than x9). We use the Taylor series
        // expansion for e^x: 1 + x + (x^2 / 2!) + (x^3 / 3!) + ... + (x^n / n!).

        let seriesSum = HUNDRED_WAD; // The initial one in the sum, with 20 decimal places.
        let term; // Each term in the sum, where the nth term is (x^n / n!).

        // The first term is simply x.
        term = x;
        seriesSum += term;

        // Each term (x^n / n!) equals the previous one times x, divided by n. Since x is a fixed point number,
        // multiplying by it requires dividing by HUNDRED_WAD, but dividing by the non-fixed point n values does not.

        term = (term * x) / HUNDRED_WAD / 2n;
        seriesSum += term;

        term = (term * x) / HUNDRED_WAD / 3n;
        seriesSum += term;

        term = (term * x) / HUNDRED_WAD / 4n;
        seriesSum += term;

        term = (term * x) / HUNDRED_WAD / 5n;
        seriesSum += term;

        term = (term * x) / HUNDRED_WAD / 6n;
        seriesSum += term;

        term = (term * x) / HUNDRED_WAD / 7n;
        seriesSum += term;

        term = (term * x) / HUNDRED_WAD / 8n;
        seriesSum += term;

        term = (term * x) / HUNDRED_WAD / 9n;
        seriesSum += term;

        term = (term * x) / HUNDRED_WAD / 10n;
        seriesSum += term;

        term = (term * x) / HUNDRED_WAD / 11n;
        seriesSum += term;

        term = (term * x) / HUNDRED_WAD / 12n;
        seriesSum += term;

        // 12 Taylor terms are sufficient for 18 decimal precision.

        // We now have the first a_n (with no decimals), and the product of all other a_n present, and the Taylor
        // approximation of the exponentiation of the remainder (both with 20 decimals). All that remains is to multiply
        // all three (one 20 decimal fixed point multiplication, dividing by HUNDRED_WAD, and one integer multiplication),
        // and then drop two digits to return an 18 decimal value.

        return (((product * seriesSum) / HUNDRED_WAD) * firstAN) / 100n;
    }

    static _ln_36(x_: bigint): bigint {
        let x = x_;
        // Since ln(1) = 0, a value of x close to one will yield a very small result, which makes using 36 digits
        // worthwhile.

        // First, we transform x to a 36 digit fixed point value.
        x *= WAD;

        // We will use the following Taylor expansion, which converges very rapidly. Let z = (x - 1) / (x + 1).
        // ln(x) = 2 * (z + z^3 / 3 + z^5 / 5 + z^7 / 7 + ... + z^(2 * n + 1) / (2 * n + 1))

        // Recall that 36 digit fixed point division requires multiplying by ONE_36, and multiplication requires
        // division by ONE_36.
        const z = ((x - RAY) * RAY) / (x + RAY);
        const z_squared = (z * z) / RAY;

        // num is the numerator of the series: the z^(2 * n + 1) term
        let num = z;

        // seriesSum holds the accumulated sum of each term in the series, starting with the initial z
        let seriesSum = num;

        // In each step, the numerator is multiplied by z^2
        num = (num * z_squared) / RAY;
        seriesSum += num / 3n;

        num = (num * z_squared) / RAY;
        seriesSum += num / 5n;

        num = (num * z_squared) / RAY;
        seriesSum += num / 7n;

        num = (num * z_squared) / RAY;
        seriesSum += num / 9n;

        num = (num * z_squared) / RAY;
        seriesSum += num / 11n;

        num = (num * z_squared) / RAY;
        seriesSum += num / 13n;

        num = (num * z_squared) / RAY;
        seriesSum += num / 15n;

        // 8 Taylor terms are sufficient for 36 decimal precision.

        // All that remains is multiplying by 2 (non fixed point).
        return seriesSum * 2n;
    }

    /**
     * @dev Internal natural logarithm (ln(a)) with signed 18 decimal fixed point argument.
     */
    static _ln(a_: bigint): bigint {
        let a = a_;
        if (a < WAD) {
            // Since ln(a^k) = k * ln(a), we can compute ln(a) as ln(a) = ln((1/a)^(-1)) = - ln((1/a)). If a is less
            // than one, 1/a will be greater than one, and this if statement will not be entered in the recursive call.
            // Fixed point division requires multiplying by this.ONE_18.
            return -1n * this._ln((WAD * WAD) / a);
        }

        // First, we use the fact that ln^(a * b) = ln(a) + ln(b) to decompose ln(a) into a sum of powers of two, which
        // we call x_n, where x_n == 2^(7 - n), which are the natural logarithm of precomputed quantities a_n (that is,
        // ln(a_n) = x_n). We choose the first x_n, x0, to equal 2^7 because the exponential of all larger powers cannot
        // be represented as 18 fixed point decimal numbers in 256 bits, and are therefore larger than a.
        // At the end of this process we will have the sum of all x_n = ln(a_n) that apply, and the remainder of this
        // decomposition, which will be lower than the smallest a_n.
        // ln(a) = k_0 * x_0 + k_1 * x_1 + ... + k_n * x_n + ln(remainder), where each k_n equals either 0 or 1.
        // We mutate a by subtracting a_n, making it the remainder of the decomposition.

        // For reasons related to how `exp` works, the first two a_n (e^(2^7) and e^(2^6)) are not stored as fixed point
        // numbers with 18 decimals, but instead as plain integers with 0 decimals, so we need to multiply them by
        // this.ONE_18 to convert them to fixed point.
        // For each a_n, we test if that term is present in the decomposition (if a is larger than it), and if so divide
        // by it and compute the accumulated sum.

        let sum = 0n;
        if (a >= this.a0 * WAD) {
            a /= this.a0; // Integer, not fixed point division
            sum += this.x0;
        }

        if (a >= this.a1 * WAD) {
            a /= this.a1; // Integer, not fixed point division
            sum += this.x1;
        }

        // All other a_n and x_n are stored as 20 digit fixed point numbers, so we convert the sum and a to this format.
        sum *= 100n;
        a *= 100n;

        // Because further a_n are  20 digit fixed point numbers, we multiply by ONE_20 when dividing by them.

        if (a >= this.a2) {
            a = (a * HUNDRED_WAD) / this.a2;
            sum += this.x2;
        }

        if (a >= this.a3) {
            a = (a * HUNDRED_WAD) / this.a3;
            sum += this.x3;
        }

        if (a >= this.a4) {
            a = (a * HUNDRED_WAD) / this.a4;
            sum += this.x4;
        }

        if (a >= this.a5) {
            a = (a * HUNDRED_WAD) / this.a5;
            sum += this.x5;
        }

        if (a >= this.a6) {
            a = (a * HUNDRED_WAD) / this.a6;
            sum += this.x6;
        }

        if (a >= this.a7) {
            a = (a * HUNDRED_WAD) / this.a7;
            sum += this.x7;
        }

        if (a >= this.a8) {
            a = (a * HUNDRED_WAD) / this.a8;
            sum += this.x8;
        }

        if (a >= this.a9) {
            a = (a * HUNDRED_WAD) / this.a9;
            sum += this.x9;
        }

        if (a >= this.a10) {
            a = (a * HUNDRED_WAD) / this.a10;
            sum += this.x10;
        }

        if (a >= this.a11) {
            a = (a * HUNDRED_WAD) / this.a11;
            sum += this.x11;
        }

        // a is now a small number (smaller than a_11, which roughly equals 1.06). This means we can use a Taylor series
        // that converges rapidly for values of `a` close to one - the same one used in ln_36.
        // Let z = (a - 1) / (a + 1).
        // ln(a) = 2 * (z + z^3 / 3 + z^5 / 5 + z^7 / 7 + ... + z^(2 * n + 1) / (2 * n + 1))

        // Recall that 20 digit fixed point division requires multiplying by ONE_20, and multiplication requires
        // division by ONE_20.
        const z = ((a - HUNDRED_WAD) * HUNDRED_WAD) / (a + HUNDRED_WAD);
        const z_squared = (z * z) / HUNDRED_WAD;

        // num is the numerator of the series: the z^(2 * n + 1) term
        let num = z;

        // seriesSum holds the accumulated sum of each term in the series, starting with the initial z
        let seriesSum = num;

        // In each step, the numerator is multiplied by z^2
        num = (num * z_squared) / HUNDRED_WAD;
        seriesSum += num / 3n;

        num = (num * z_squared) / HUNDRED_WAD;
        seriesSum += num / 5n;

        num = (num * z_squared) / HUNDRED_WAD;
        seriesSum += num / 7n;

        num = (num * z_squared) / HUNDRED_WAD;
        seriesSum += num / 9n;

        num = (num * z_squared) / HUNDRED_WAD;
        seriesSum += num / 11n;

        // 6 Taylor terms are sufficient for 36 decimal precision.

        // Finally, we multiply by 2 (non fixed point) to compute ln(remainder)
        seriesSum *= 2n;

        // We now have the sum of all x_n present, and the Taylor approximation of the logarithm of the remainder (both
        // with 20 decimals). All that remains is to sum these two, and then drop two digits to return a 18 decimal
        // value.

        return (sum + seriesSum) / 100n;
    }
}
