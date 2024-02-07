import { PathWithAmount } from './pathWithAmount';
import { TokenAmount } from '../tokenAmount';

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
