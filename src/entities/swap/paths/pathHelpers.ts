import { PathWithAmount } from './pathWithAmount';
import { TokenAmount } from '../../tokenAmount';
import { isSameAddress } from '@/utils';
import { Path } from './types';
import { Address } from 'viem';

export function getInputAmount(paths: PathWithAmount[]): TokenAmount {
    if (
        !paths.every((p) =>
            p.inputAmount.token.isEqual(paths[0].inputAmount.token),
        )
    ) {
        throw new Error(
            'Input amount can only be calculated if all paths have the same input token',
        );
    }
    const amounts = paths.map((path) => path.inputAmount);
    return amounts.reduce((a, b) => a.add(b));
}

export function getOutputAmount(paths: PathWithAmount[]): TokenAmount {
    if (
        !paths.every((p) =>
            p.outputAmount.token.isEqual(paths[0].outputAmount.token),
        )
    ) {
        throw new Error(
            'Output amount can only be calculated if all paths have the same output token',
        );
    }
    const amounts = paths.map((path) => path.outputAmount);
    return amounts.reduce((a, b) => a.add(b));
}

export function validatePaths(paths: Path[]) {
    if (paths.length === 0)
        throw new Error('Invalid swap: must contain at least 1 path.');

    validateBufferVersion(paths);
    validateBufferLength(paths);

    const protocolVersion = paths[0].protocolVersion;
    if (!paths.every((p) => p.protocolVersion === protocolVersion))
        throw new Error(
            'Unsupported swap: all paths must use same Balancer version.',
        );

    const tokenIn = paths[0].tokens[0].address.toLowerCase();
    const tokenOut =
        paths[0].tokens[paths[0].tokens.length - 1].address.toLowerCase();
    if (
        !paths.every(
            (p) =>
                p.tokens[0].address.toLowerCase() === tokenIn &&
                p.tokens[p.tokens.length - 1].address.toLowerCase() ===
                    tokenOut,
        )
    ) {
        throw new Error(
            'Unsupported swap: all paths must start/end with same token.',
        );
    }
}

function validateBufferVersion(paths: Path[]) {
    if (
        !paths.every((p) => {
            return p.isBuffer?.some((b) => b === true)
                ? p.protocolVersion === 3
                : true;
        })
    ) {
        throw new Error('Unsupported swap: buffers not supported in V2.');
    }
}

function validateBufferLength(paths: Path[]) {
    if (
        !paths.every((p) => {
            return p.isBuffer ? p.isBuffer.length === p.pools.length : true;
        })
    ) {
        throw new Error(
            'Unsupported swap: buffers and pools must have same length.',
        );
    }
}

/**
 * Determines if the given paths represent a batch swap.
 *
 * A batch swap is identified by one of the following conditions:
 * - There is more than one path.
 * - The first path contains more than one pool.
 * - The input token is the same as the first pool in the first path. (a BPT swap)
 * - The output token is the same as the first pool in the first path. (a BPT swap)
 */
export function isBatchSwap(
    paths: Path[],
    inputToken: Address,
    outputToken: Address,
): boolean {
    return (
        paths.length > 1 ||
        paths[0].pools.length > 1 ||
        isSameAddress(paths[0].pools[0], inputToken) ||
        isSameAddress(paths[0].pools[0], outputToken)
    );
}
