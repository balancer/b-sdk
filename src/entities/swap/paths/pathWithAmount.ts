import { TokenAmount } from '../../tokenAmount';
import { Address } from 'viem';
import { BaseToken } from '../../baseToken';
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
        const tokenIn = new BaseToken(
            chainId,
            tokens[0].address,
            tokens[0].decimals,
        );
        const tokenOut = new BaseToken(
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
