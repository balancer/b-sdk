import { Path } from './path';
import { TokenAmount } from './tokenAmount';
import { SwapKind } from '../types';

export enum BatchOrSingle {
  BatchSwap,
  SingleSwap,
}

export class Swap {

  public static async fromPaths(
    fromPaths: Path[],
    swapKind: SwapKind,
    swapAmount: TokenAmount
  ): Promise<Swap> {
    const paths: {
      path: Path,
      inputAmount: TokenAmount,
      outputAmount: TokenAmount
    }[] = [];

    const inputAmount = swapAmount;

    for (const path of fromPaths) {
      const amounts: TokenAmount[] = new Array(path.tokens.length);
      amounts[0] = swapAmount;
      for (let i = 0; i < path.pools.length; i++) {
        const pool = path.pools[i];
        const outputAmount = await pool.swapGivenIn(
          path.tokens[i],
          path.tokens[i + 1],
          amounts[i]
        );
        amounts[i + 1] = outputAmount;
      }
      const outputAmount = amounts[amounts.length - 1];
      paths.push({path, inputAmount, outputAmount})
    }

    return new Swap({paths, swapKind});
  }

  protected constructor({
    paths,
    swapKind,
  }: {
    paths: {
      path: Path,
      inputAmount: TokenAmount,
      outputAmount: TokenAmount
    }[],
    swapKind: SwapKind;
  }) {
    this.paths = paths;
    this.swapKind = swapKind;
  }


  public readonly paths: {
    path: Path,
    inputAmount: TokenAmount,
    outputAmount: TokenAmount
  }[];
  public readonly swapKind: SwapKind;

  // public get inputAmount(): TokenAmount {}
  // public get outputAmount(): TokenAmount {}

  // public get executionPrice(): Price {}
  // public get priceImpact(): Percent {}

}
