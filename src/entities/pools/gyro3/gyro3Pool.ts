import { Hex, parseEther } from 'viem';

import {
    _calcInGivenOut,
    _calcOutGivenIn,
    _calculateInvariant,
} from './gyro3Math';
import { BasePool } from '..';
import { BigintIsh, Token, TokenAmount } from '../..';
import { RawGyro3Pool } from '../../../data/types';
import { PoolType, SwapKind } from '../../../types';
import { getPoolAddress, MathSol, WAD } from '../../../utils';
import { MathGyro, SWAP_LIMIT_FACTOR } from '../../../utils/gyroHelpers/math';

export class Gyro3PoolToken extends TokenAmount {
    public readonly index: number;

    public constructor(token: Token, amount: BigintIsh, index: number) {
        super(token, amount);
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

export class Gyro3Pool implements BasePool {
    public readonly chainId: number;
    public readonly id: Hex;
    public readonly address: string;
    public readonly poolType: PoolType = PoolType.Gyro2;
    public readonly poolTypeVersion: number;
    public readonly swapFee: bigint;
    public readonly tokens: Gyro3PoolToken[];

    private readonly root3Alpha: bigint;
    private readonly tokenMap: Map<string, Gyro3PoolToken>;

    static fromRawPool(chainId: number, pool: RawGyro3Pool): Gyro3Pool {
        const poolTokens: Gyro3PoolToken[] = [];

        for (const t of pool.tokens) {
            const token = new Token(
                chainId,
                t.address,
                t.decimals,
                t.symbol,
                t.name,
            );
            const tokenAmount = TokenAmount.fromHumanAmount(token, t.balance);

            poolTokens.push(
                new Gyro3PoolToken(token, tokenAmount.amount, t.index),
            );
        }

        return new Gyro3Pool(
            pool.id,
            pool.poolTypeVersion,
            parseEther(pool.swapFee),
            parseEther(pool.root3Alpha),
            poolTokens,
        );
    }

    constructor(
        id: Hex,
        poolTypeVersion: number,
        swapFee: bigint,
        root3Alpha: bigint,
        tokens: Gyro3PoolToken[],
    ) {
        this.chainId = tokens[0].token.chainId;
        this.id = id;
        this.poolTypeVersion = poolTypeVersion;
        this.swapFee = swapFee;
        this.root3Alpha = root3Alpha;
        this.address = getPoolAddress(id);
        this.tokens = tokens;
        this.tokenMap = new Map(
            this.tokens.map((token) => [token.token.address, token]),
        );
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const tIn = this.tokenMap.get(tokenIn.wrapped);
        const tOut = this.tokenMap.get(tokenOut.wrapped);

        if (!tIn || !tOut)
            throw new Error('Pool does not contain the tokens provided');
        // TODO: Fix gyro normalized liquidity calc
        return tOut.amount;
    }

    public swapGivenIn(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
        mutateBalances?: boolean,
    ): TokenAmount {
        const { tIn, tOut, tertiary } = this.getPoolPairData(tokenIn, tokenOut);
        const invariant = _calculateInvariant(
            [tIn.scale18, tOut.scale18, tertiary.scale18],
            this.root3Alpha,
        );
        const virtualOffsetInOut = MathGyro.mulDown(invariant, this.root3Alpha);
        const inAmountLessFee = this.subtractSwapFeeAmount(swapAmount);

        const outAmountScale18 = _calcOutGivenIn(
            tIn.scale18,
            tOut.scale18,
            inAmountLessFee.scale18,
            virtualOffsetInOut,
        );

        if (outAmountScale18 > tOut.scale18)
            throw new Error('ASSET_BOUNDS_EXCEEDED');

        const outAmount = TokenAmount.fromScale18Amount(
            tokenOut,
            outAmountScale18,
        );

        if (mutateBalances) {
            tIn.increase(swapAmount.amount);
            tOut.decrease(outAmount.amount);
        }

        return outAmount;
    }

    public swapGivenOut(
        tokenIn: Token,
        tokenOut: Token,
        swapAmount: TokenAmount,
        mutateBalances?: boolean,
    ): TokenAmount {
        const { tIn, tOut, tertiary } = this.getPoolPairData(tokenIn, tokenOut);

        if (swapAmount.scale18 > tOut.scale18)
            throw new Error('ASSET_BOUNDS_EXCEEDED');

        const invariant = _calculateInvariant(
            [tIn.scale18, tOut.scale18, tertiary.scale18],
            this.root3Alpha,
        );

        const virtualOffsetInOut = MathGyro.mulDown(invariant, this.root3Alpha);

        const inAmountLessFee = _calcInGivenOut(
            tIn.scale18,
            tOut.scale18,
            swapAmount.scale18,
            virtualOffsetInOut,
        );
        const inAmount = this.addSwapFeeAmount(
            TokenAmount.fromScale18Amount(tokenIn, inAmountLessFee, true),
        );

        if (mutateBalances) {
            tIn.decrease(inAmount.amount);
            tOut.increase(swapAmount.amount);
        }

        return inAmount;
    }

    public getLimitAmountSwap(
        tokenIn: Token,
        tokenOut: Token,
        swapKind: SwapKind,
    ): bigint {
        const { tIn, tOut, tertiary } = this.getPoolPairData(tokenIn, tokenOut);
        if (swapKind === SwapKind.GivenIn) {
            const invariant = _calculateInvariant(
                [tIn.scale18, tOut.scale18, tertiary.scale18],
                this.root3Alpha,
            );
            const a = MathGyro.mulDown(invariant, this.root3Alpha);
            const maxAmountInAssetInPool =
                MathGyro.divDown(
                    MathGyro.mulDown(tIn.scale18 + a, tOut.scale18 + a),
                    a,
                ) - a; // (x + a)(y + a) / a - a
            const limitAmountIn = maxAmountInAssetInPool - tIn.scale18;
            const limitAmountInPlusSwapFee = MathGyro.divDown(
                limitAmountIn,
                WAD - this.swapFee,
            );
            return MathGyro.mulDown(
                limitAmountInPlusSwapFee,
                SWAP_LIMIT_FACTOR,
            );
        } else {
            return MathGyro.mulDown(tOut.amount, SWAP_LIMIT_FACTOR);
        }
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulUpFixed(this.swapFee);
        return amount.sub(feeAmount);
    }

    public addSwapFeeAmount(amount: TokenAmount): TokenAmount {
        return amount.divUpFixed(MathSol.complementFixed(this.swapFee));
    }

    public getPoolPairData(
        tokenIn: Token,
        tokenOut: Token,
    ): {
        tIn: Gyro3PoolToken;
        tOut: Gyro3PoolToken;
        tertiary: Gyro3PoolToken;
    } {
        const tIn = this.tokenMap.get(tokenIn.wrapped);
        const tOut = this.tokenMap.get(tokenOut.wrapped);

        const tertiaryAddress = this.tokens
            .map((t) => t.token.wrapped)
            .find((a) => a !== tokenIn.wrapped && a !== tokenOut.wrapped);
        const tertiary = this.tokenMap.get(tertiaryAddress as string);

        if (!tIn || !tOut || !tertiary) {
            throw new Error('Pool does not contain the tokens provided');
        }

        return { tIn, tOut, tertiary };
    }
}
