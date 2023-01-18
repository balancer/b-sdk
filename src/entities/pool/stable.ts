import { parseEther } from '@ethersproject/units';
import { PoolType, SwapKind } from '../../types';
import { Token, TokenAmount, BigintIsh } from '../../entities/';
import { BasePool } from './';
import { SubgraphPool } from '../../poolProvider';
import { BONE, getPoolAddress } from '../../utils';
import { _calculateInvariant, _calcOutGivenIn } from './stableMath';

export class StablePoolToken extends TokenAmount {
    public readonly rate: bigint;
    public readonly scale18: bigint;

    public constructor(token: Token, amount: BigintIsh, rate: BigintIsh) {
        super(token, amount);
        this.rate = BigInt(rate);
        this.scale18 = this.amount * this.rate;
    }
}
export class StablePool implements BasePool {
    id: string;
    address: string;
    poolType: PoolType = PoolType.ComposableStable;
    amp: bigint;
    swapFee: bigint;
    tokens: StablePoolToken[];
    balances: bigint[];
    // TODO: Stable limits
    MAX_IN_RATIO = BigInt('300000000000000000'); // 0.3
    MAX_OUT_RATIO = BigInt('300000000000000000'); // 0.3

    static fromRawPool(pool: SubgraphPool): StablePool {
        const poolTokens = pool.tokens.map(t => {
            if (!t.priceRate) throw new Error('Stable pool token does not have a price rate');
            const token = new Token(1, t.address, t.decimals, t.symbol, t.name);
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);
            return new StablePoolToken(
                token,
                tokenAmount.amount,
                parseEther(t.priceRate).toString(),
            );
        });
        const stablePool = new StablePool(
            pool.id,
            BigInt(parseEther(pool.amp).toString()),
            BigInt(parseEther(pool.swapFee).toString()),
            poolTokens,
        );
        return stablePool;
    }

    constructor(id: string, amp: bigint, swapFee: bigint, tokens: StablePoolToken[]) {
        this.id = id;
        this.tokens = tokens;
        this.address = getPoolAddress(id);
        this.amp = amp;
        this.swapFee = swapFee;
        this.balances = tokens.map(t => t.scale18);
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
        // TODO: Fix stable normalized liquidity calc
        return tOut.amount * this.amp;
    }

    public getLimitAmountSwap(tokenIn: Token, tokenOut: Token, swapKind: SwapKind): bigint {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');

        if (swapKind === SwapKind.GivenIn) {
            return (tIn.amount * this.MAX_IN_RATIO) / BONE;
        } else {
            return (tOut.amount * this.MAX_OUT_RATIO) / BONE;
        }
    }

    public swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        const tInIndex = this.tokens.findIndex(t => t.token.address === tokenIn.address);
        const tOutIndex = this.tokens.findIndex(t => t.token.address === tokenOut.address);

        if (tInIndex < 0 || tOutIndex < 0)
            throw new Error('Pool does not contain the tokens provided');

        const amountWithFee = this.subtractSwapFeeAmount(swapAmount);
        const amountWithRate = amountWithFee.mulFixed(this.tokens[tInIndex].rate);
        const invariant = _calculateInvariant(this.amp, this.balances);

        const tokenOutScale18 = _calcOutGivenIn(
            this.amp,
            this.balances,
            tInIndex,
            tOutIndex,
            amountWithRate.scale18,
            invariant,
        );

        // TODO: Scale rate back down in TokenAmountRate class
        return TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulFixed(this.swapFee);
        return amount.sub(feeAmount);
    }
}
