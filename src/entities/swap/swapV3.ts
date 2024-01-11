import { Swap, SwapBase } from '.';
import { TokenAmount } from '../tokenAmount';

export class SwapV3 extends Swap implements SwapBase {
    query(rpcUrl?: string, block?: bigint): Promise<TokenAmount> {
        console.log(rpcUrl, block);
        throw new Error('Method not implemented.');
    }

    queryCallData(): string {
        throw new Error('Method not implemented.');
    }
}
