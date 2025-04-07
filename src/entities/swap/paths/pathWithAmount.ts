import { TokenAmount } from '../../tokenAmount';
import { Address } from 'viem';
import { Token } from '../../token';
import { TokenApi } from './types';

export class PathWithAmount {
    public readonly pools: Address[];
    public readonly isBuffer: boolean[];
    public readonly tokens: TokenApi[];
    public readonly outputAmount: TokenAmount;
    public readonly inputAmount: TokenAmount;

    public constructor(
        chainId: number,
        tokens: TokenApi[],
        pools: Address[],
        inputAmountRaw: bigint,
        outputAmountRaw: bigint,
        isBuffer: boolean[] | undefined,
    ) {
        const tokenIn = new Token(
            chainId,
            tokens[0].address,
            tokens[0].decimals,
        );
        const tokenOut = new Token(
            chainId,
            tokens[tokens.length - 1].address,
            tokens[tokens.length - 1].decimals,
        );
        this.pools = pools;
        this.isBuffer = isBuffer
            ? isBuffer
            : new Array(this.pools.length).fill(false);
        this.tokens = tokens;
        this.inputAmount = TokenAmount.fromRawAmount(tokenIn, inputAmountRaw);
        this.outputAmount = TokenAmount.fromRawAmount(
            tokenOut,
            outputAmountRaw,
        );
    }
}
