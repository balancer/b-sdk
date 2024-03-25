import { PathWithAmount } from './pathWithAmount';
import { TokenAmount } from '../../tokenAmount';
import { Path } from './types';

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

    const vaultVersion = paths[0].vaultVersion;
    if (!paths.every((p) => p.vaultVersion === vaultVersion))
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
