import { BasePool } from './pool/';
import { Token } from './token';

export class Path {
  public readonly pools: BasePool[];
  public readonly tokens: Token[];

  public constructor(tokens: Token[], pools: BasePool[]) {

    this.pools = pools;
    this.tokens = tokens;
  }

}
