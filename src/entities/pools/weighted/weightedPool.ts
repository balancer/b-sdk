import { Hex, parseEther } from 'viem';
import { PoolType, SwapKind } from '../../../types';
import { Token } from '../../token';
import { TokenAmount, BigintIsh } from '../../tokenAmount';
import { BasePool } from '..';
import { MathSol, WAD, getPoolAddress } from '../../../utils';
import { _calcOutGivenIn, _calcInGivenOut } from './weightedMath';
import { RawWeightedPool } from '../../../data/types';
import { PriceImpactAmount } from '@/entities/priceImpactAmount';

class WeightedPoolToken extends TokenAmount {
    public readonly weight: bigint;
    public readonly index: number;

    public constructor(
        token: Token,
        amount: BigintIsh,
        weight: BigintIsh,
        index: number,
    ) {
        super(token, amount);
        this.weight = BigInt(weight);
        this.index = index;
    }

    public increase(amount: bigint): TokenAmount {
        this.amount = this.amount + amount;
        this.scale18 = this.amount * this.scalar;
        return this;
    }

    public decrease(amount: bigint): TokenAmount {
        this.amount = this.amount - amount;
        this.scale18 = this.amount * this.scalar;
        return this;
    }
}

export class WeightedPool implements BasePool {
    public readonly chainId: number;
    public readonly id: Hex;
    public readonly address: string;
    public readonly poolType: PoolType = PoolType.Weighted;
    public readonly poolTypeVersion: number;
    public readonly swapFee: bigint;
    public readonly tokens: WeightedPoolToken[];

    private readonly tokenMap: Map<string, WeightedPoolToken>;
    private readonly MAX_IN_RATIO = 300000000000000000n; // 0.3
    private readonly MAX_OUT_RATIO = 300000000000000000n; // 0.3

    static fromRawPool(chainId: number, pool: RawWeightedPool): WeightedPool {
        const poolTokens: WeightedPoolToken[] = [];

        for (const t of pool.tokens) {
            if (!t.weight) {
                throw new Error('Weighted pool token does not have a weight');
            }

            const token = new Token(
                chainId,
                t.address,
                t.decimals,
                t.symbol,
                t.name,
            );
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);

            poolTokens.push(
                new WeightedPoolToken(
                    token,
                    tokenAmount.amount,
                    parseEther(t.weight),
                    t.index,
                ),
            );
        }

        return new WeightedPool(
            pool.id,
            pool.poolTypeVersion,
            parseEther(pool.swapFee),
            poolTokens,
        );
    }

    constructor(
        id: Hex,
        poolTypeVersion: number,
        swapFee: bigint,
        tokens: WeightedPoolToken[],
    ) {
        this.chainId = tokens[0].token.chainId;
        this.id = id;
        this.poolTypeVersion = poolTypeVersion;
        this.address = getPoolAddress(id);
        this.swapFee = swapFee;
        this.tokens = tokens;
        this.tokenMap = new Map(
            tokens.map((token) => [token.token.address, token]),
        );
    }

    public spotPrice(tokenIn: Token, tokenOut: Token): bigint {
        const { tIn } = this.getRequiredTokenPair(tokenIn, tokenOut);

        const amountAInitial = TokenAmount.fromRawAmount(
            tokenIn,
            tIn.amount / 10000n,
        );

        const amountB = this.swapGivenIn(
            tokenIn,
            tokenOut,
            amountAInitial,
            false,
        );

        const priceAtoB = MathSol.divDownFixed(
            amountAInitial.amount,
            amountB.amount,
        );

        const amountAFinal = this.swapGivenIn(
            tokenOut,
            tokenIn,
            amountB,
            false,
        );

        const priceBtoA = MathSol.divDownFixed(
            amountB.amount,
            amountAFinal.amount,
        );

        return MathSol.powDownFixed(
            MathSol.divDownFixed(priceAtoB, priceBtoA),
            WAD / 2n,
        );
    }

    public priceImpact(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
    ): PriceImpactAmount {
        let effectivePrice: bigint;
        if (swapAmount.token.isSameAddress(tokenIn.address)) {
            const swapResult = this.swapGivenIn(
                tokenIn,
                tokenOut,
                swapAmount,
                false,
            );
            effectivePrice = MathSol.divDownFixed(
                swapAmount.amount,
                swapResult.amount,
            );
        } else {
            const swapResult = this.swapGivenOut(
                tokenIn,
                tokenOut,
                swapAmount,
                false,
            );
            effectivePrice = MathSol.divDownFixed(
                swapResult.amount,
                swapAmount.amount,
            );
        }
        const spotPrice = this.spotPrice(tokenIn, tokenOut);
        const priceRatio = MathSol.divDownFixed(spotPrice, effectivePrice);
        const priceImpact = PriceImpactAmount.fromRawAmount(WAD - priceRatio);
        return priceImpact;
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const amount = TokenAmount.fromHumanAmount(tokenOut, `${1}`); // TODO: fill with fixed amount equivalent to 100 USD
        const priceImpact = this.priceImpact(tokenIn, tokenOut, amount);
        const normalizedLiquidity = MathSol.divDownFixed(
            WAD,
            priceImpact.amount,
        );
        return normalizedLiquidity;
    }

    public getLimitAmountSwap(
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
    ): bigint {
        const { tIn, tOut } = this.getRequiredTokenPair(tokenIn, tokenOut);

        if (swapKind === SwapKind.GivenIn) {
            return (tIn.amount * this.MAX_IN_RATIO) / WAD;
        }
        return (tOut.amount * this.MAX_OUT_RATIO) / WAD;
    }

    public swapGivenIn(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
        mutateBalances?: boolean,
    ): TokenAmount {
        const { tIn, tOut } = this.getRequiredTokenPair(tokenIn, tokenOut);

        if (
            swapAmount.amount >
            this.getLimitAmountSwap(tokenIn, tokenOut, SwapKind.GivenIn)
        ) {
            throw new Error('Swap amount exceeds the pool limit');
        }

        const amountWithFee = this.subtractSwapFeeAmount(swapAmount);

        const tokenOutScale18 = _calcOutGivenIn(
            tIn.scale18,
            tIn.weight,
            tOut.scale18,
            tOut.weight,
            amountWithFee.scale18,
            this.poolTypeVersion,
        );

        const tokenOutAmount = TokenAmount.fromScale18Amount(
            tokenOut,
            tokenOutScale18,
        );

        if (mutateBalances) {
            tIn.increase(swapAmount.amount);
            tOut.decrease(tokenOutAmount.amount);
        }

        return tokenOutAmount;
    }

    public swapGivenOut(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
        mutateBalances?: boolean,
    ): TokenAmount {
        const { tIn, tOut } = this.getRequiredTokenPair(tokenIn, tokenOut);

        if (
            swapAmount.amount >
            this.getLimitAmountSwap(tokenIn, tokenOut, SwapKind.GivenOut)
        ) {
            throw new Error('Swap amount exceeds the pool limit');
        }

        const tokenInScale18 = _calcInGivenOut(
            tIn.scale18,
            tIn.weight,
            tOut.scale18,
            tOut.weight,
            swapAmount.scale18,
            this.poolTypeVersion,
        );

        const tokenInAmount = this.addSwapFeeAmount(
            TokenAmount.fromScale18Amount(tokenIn, tokenInScale18, true),
        );

        if (mutateBalances) {
            tIn.increase(tokenInAmount.amount);
            tOut.decrease(swapAmount.amount);
        }

        return tokenInAmount;
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulUpFixed(this.swapFee);
        return amount.sub(feeAmount);
    }

    public addSwapFeeAmount(amount: TokenAmount): TokenAmount {
        return amount.divUpFixed(MathSol.complementFixed(this.swapFee));
    }

    private getRequiredTokenPair(
        tokenIn: Token,
        tokenOut: Token,
    ): { tIn: WeightedPoolToken; tOut: WeightedPoolToken } {
        const tIn = this.tokenMap.get(tokenIn.wrapped);
        const tOut = this.tokenMap.get(tokenOut.wrapped);

        if (!tIn || !tOut) {
            throw new Error('Pool does not contain the tokens provided');
        }

        return { tIn, tOut };
    }
}
