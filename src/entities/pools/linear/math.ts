import { MathSol, WAD } from '@/utils/';
import { Params } from './';

export function _calcWrappedOutPerMainIn(
    mainIn: bigint,
    mainBalance: bigint,
    params: Params
): bigint {
    // Amount out, so we round down overall.
    const previousNominalMain = _toNominal(mainBalance, params);
    const afterNominalMain = _toNominal(mainBalance + mainIn, params);
    return afterNominalMain - previousNominalMain;
}

export function _calcBptOutPerMainIn(
    mainIn: bigint,
    mainBalance: bigint,
    wrappedBalance: bigint,
    bptSupply: bigint,
    params: Params
): bigint {
    // Amount out, so we round down overall.

    if (bptSupply == 0n) {
        return _toNominal(mainIn, params);
    }

    const previousNominalMain = _toNominal(mainBalance, params);
    const afterNominalMain = _toNominal(mainBalance + mainIn, params);
    const deltaNominalMain = afterNominalMain - previousNominalMain;
    const invariant = _calcInvariant(
        previousNominalMain,
        wrappedBalance
    );
    return (bptSupply * deltaNominalMain) / invariant;
}

export function _calcMainOutPerWrappedIn(
    wrappedIn: bigint,
    mainBalance: bigint,
    params: Params
): bigint {
    const previousNominalMain = _toNominal(mainBalance, params);
    const afterNominalMain = previousNominalMain - wrappedIn;
    const newMainBalance = _fromNominal(afterNominalMain, params);
    return mainBalance - newMainBalance;
}

export function _calcBptOutPerWrappedIn(
    wrappedIn: bigint,
    mainBalance: bigint,
    wrappedBalance: bigint,
    bptSupply: bigint,
    params: Params
): bigint {
    // Amount out, so we round down overall.

    if (bptSupply === 0n) {
        // BPT typically grows in the same ratio the invariant does. The first time liquidity is added however, the
        // BPT supply is initialized to equal the invariant (which in this case is just the wrapped balance as
        // there is no main balance).
        return wrappedIn;
    }

    const nominalMain = _toNominal(mainBalance, params);
    const previousInvariant = _calcInvariant(nominalMain, wrappedBalance);

    const newWrappedBalance = wrappedBalance + wrappedIn;
    const newInvariant = _calcInvariant(nominalMain, newWrappedBalance);

    const newBptBalance = (bptSupply * newInvariant) / previousInvariant;
    return newBptBalance - bptSupply;
}

export function _calcMainOutPerBptIn(
    bptIn: bigint,
    mainBalance: bigint,
    wrappedBalance: bigint,
    bptSupply: bigint,
    params: Params
): bigint {
    // Amount out, so we round down overall.
    const previousNominalMain = _toNominal(mainBalance, params);
    const invariant = _calcInvariant(
        previousNominalMain,
        wrappedBalance
    );
    const deltaNominalMain = (invariant * bptIn) / bptSupply;
    const afterNominalMain = previousNominalMain - deltaNominalMain;
    const newMainBalance = _fromNominal(afterNominalMain, params);
    return mainBalance - newMainBalance;
}

export function _calcWrappedOutPerBptIn(
    bptIn: bigint,
    mainBalance: bigint,
    wrappedBalance: bigint,
    bptSupply: bigint,
    params: Params
): bigint {
    // Amount out, so we round down overall.
    const nominalMain = _toNominal(mainBalance, params);
    const previousInvariant = _calcInvariant(
        nominalMain,
        wrappedBalance
    );
    const newBptBalance = bptSupply - bptIn;
    const newWrappedBalance = MathSol.divUpFixed(
        ((newBptBalance * previousInvariant) / bptSupply) - nominalMain,
        params.rate
    );

    return wrappedBalance - newWrappedBalance;
}

function _calcInvariant(
    nominalMainBalance: bigint,
    wrappedBalance: bigint,
): bigint {
    return nominalMainBalance + wrappedBalance;
}

function _toNominal(real: bigint, params: Params): bigint {
    // Fees are always rounded down: either direction would work but we need to be consistent, and rounding down
    // uses less gas.
    if (real < params.lowerTarget) {
        const fees = MathSol.mulDownFixed(
            params.lowerTarget - real,
            params.fee
        );
        return real - fees;
    } else if (real <= params.upperTarget) {
        return real;
    } else {
        const fees = MathSol.mulDownFixed(
            real - params.upperTarget,
            params.fee
        );
        return real - fees;
    }
}

function _fromNominal(nominal: bigint, params: Params): bigint {
    // Since real = nominal + fees, rounding down fees is equivalent to rounding down real.
    if (nominal < params.lowerTarget) {
        return MathSol.divDownFixed(
            nominal + MathSol.mulDownFixed(params.fee, params.lowerTarget),
            WAD + params.fee
        );
    } else if (nominal <= params.upperTarget) {
        return nominal;
    } else {
        return MathSol.divDownFixed(
            nominal - MathSol.mulDownFixed(params.fee, params.upperTarget),
            WAD - params.fee
        );
    }
}