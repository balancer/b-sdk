import { parseEther } from '@ethersproject/units';
import { PoolType, SwapKind } from '../../types';
import { Token, TokenAmount, BigintIsh } from '../../entities/';
import { BasePool } from './';
import { SubgraphPool } from '../../poolProvider';
import { BONE, getPoolAddress } from '../../utils';
import { _calcOutGivenInV1, _calcOutGivenInV2 } from './weightedMath';

export class WeightedPoolToken extends TokenAmount {
    public readonly weight: bigint;

    public constructor(token: Token, amount: BigintIsh, weight: BigintIsh) {
        super(token, amount);
        this.weight = BigInt(weight);
    }
}

export class WeightedPool implements BasePool {
    id: string;
    address: string;
    poolType: PoolType = PoolType.Weighted;
    poolTypeVersion: number;
    swapFee: bigint;
    tokens: WeightedPoolToken[];
    MAX_IN_RATIO = 300000000000000000n; // 0.3
    MAX_OUT_RATIO = 300000000000000000n; // 0.3

    static fromRawPool(pool: SubgraphPool): WeightedPool {
        const poolTokens = pool.tokens.map(t => {
            const token = new Token(1, t.address, t.decimals, t.symbol, t.name);
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);
            // TODO Fix weight parse hack
            return new WeightedPoolToken(
                token,
                tokenAmount.amount,
                parseEther(Number(t.weight).toString()).toString(),
            );
        });
        const weightedPool = new WeightedPool(
            pool.id,
            pool.poolTypeVersion,
            BigInt(parseEther(pool.swapFee).toString()),
            poolTokens,
        );
        return weightedPool;
    }

    constructor(id: string, poolTypeVersion: number, swapFee: bigint, tokens: WeightedPoolToken[]) {
        this.id = id;
        this.poolTypeVersion = poolTypeVersion;
        this.tokens = tokens;
        this.address = getPoolAddress(id);
        this.swapFee = swapFee;
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
        return (tIn.amount * tOut.weight) / (tIn.weight + tOut.weight);
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
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');

        const amountWithFee = this.subtractSwapFeeAmount(swapAmount);
        let tokenOutScale18: bigint;
        
        if (this.poolTypeVersion === 1) {
            tokenOutScale18 = _calcOutGivenInV1(
                tIn.scale18,
                tIn.weight,
                tOut.scale18,
                tOut.weight,
                amountWithFee.scale18,
            );
        } else {
            tokenOutScale18 = _calcOutGivenInV2(
                tIn.scale18,
                tIn.weight,
                tOut.scale18,
                tOut.weight,
                amountWithFee.scale18,
            );
        }

        return TokenAmount.fromScale18Amount(tokenOut, tokenOutScale18);
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulFixed(this.swapFee);
        return amount.sub(feeAmount);
    }
}
