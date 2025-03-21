import { PathWithAmount } from './pathWithAmount';
import { TokenAmount } from '../../tokenAmount';
import { inputValidationError, isSameAddress } from '@/utils';
import { Path } from './types';
import { Address } from 'viem';

export function getInputAmount(paths: PathWithAmount[]): TokenAmount {
    if (
        !paths.every((p) =>
            p.inputAmount.token.isEqual(paths[0].inputAmount.token),
        )
    ) {
        throw inputValidationError(
            'Swap',
            'Input amount can only be calculated if all paths have the same input token.',
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
        throw inputValidationError(
            'Swap',
            'Output amount can only be calculated if all paths have the same output token.',
        );
    }
    const amounts = paths.map((path) => path.outputAmount);
    return amounts.reduce((a, b) => a.add(b));
}

export function validatePaths(paths: Path[]) {
    if (paths.length === 0)
        throw inputValidationError('Swap', 'Must contain at least 1 path.');

    if (paths.some((p) => p.pools.length === 0))
        throw inputValidationError(
            'Swap',
            'All paths must contain at least 1 pool.',
        );

    if (paths.some((p) => p.tokens.length < 2))
        throw inputValidationError(
            'Swap',
            'All paths must contain at least 2 tokens.',
        );

    if (paths.some((p) => p.tokens.length !== p.pools.length + 1))
        throw inputValidationError(
            'Swap',
            'All paths must contain tokens length equal pools length + 1',
        );

    validateBufferVersion(paths);
    validateBufferLength(paths);

    const protocolVersion = paths[0].protocolVersion;
    if (!paths.every((p) => p.protocolVersion === protocolVersion))
        throw inputValidationError(
            'Swap',
            'All paths must use same Balancer version.',
        );

    const tokenIn = paths[0].tokens[0].address.toLowerCase();
    if (paths.some((p) => p.tokens[0].address.toLowerCase() !== tokenIn))
        throw inputValidationError(
            'Swap',
            'All paths must start with same token.',
        );

    const tokenOut =
        paths[0].tokens[paths[0].tokens.length - 1].address.toLowerCase();
    if (
        paths.some(
            (p) =>
                p.tokens[p.tokens.length - 1].address.toLowerCase() !==
                tokenOut,
        )
    )
        throw inputValidationError(
            'Swap',
            'All paths must end with same token.',
        );
}

function validateBufferVersion(paths: Path[]) {
    if (
        !paths.every((p) => {
            return p.isBuffer?.some((b) => b === true)
                ? p.protocolVersion === 3
                : true;
        })
    ) {
        throw inputValidationError(
            'Swap',
            'Swap with buffers not supported in Balancer v2.',
        );
    }
}

function validateBufferLength(paths: Path[]) {
    if (
        !paths.every((p) => {
            return p.isBuffer ? p.isBuffer.length === p.pools.length : true;
        })
    ) {
        throw inputValidationError(
            'Swap',
            'buffers and pools must have same length.',
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
