import { PoolType } from '../../../types';
import { BigintIsh, Token, TokenAmount } from '../../';
import { BasePool } from '../../pools';
import { getPoolAddress, MAX_UINT256, unsafeFastParseEther, WAD } from '../../../utils';
import {
    _calcBptOutPerMainIn,
    _calcBptOutPerWrappedIn,
    _calcMainOutPerBptIn,
    _calcMainOutPerWrappedIn,
    _calcWrappedOutPerBptIn,
    _calcWrappedOutPerMainIn,
} from './math';
import { RawLinearPool } from '../../../data/types';

export class BPT extends TokenAmount {
    public readonly rate: bigint;
    public readonly virtualBalance: bigint;

    public constructor(token: Token, amount: BigintIsh) {
        super(token, amount);
        this.rate = 1n;
        this.virtualBalance = MAX_UINT256 - this.amount;
    }
}

export class WrappedToken extends TokenAmount {
    public readonly rate: bigint;
    public readonly scale18: bigint;

    public constructor(token: Token, amount: BigintIsh, rate: BigintIsh) {
        super(token, amount);
        this.rate = BigInt(rate);
        this.scale18 = (this.amount * this.scalar * this.rate) / WAD;
    }
}

export type Params = {
    fee: bigint;
    rate: bigint;
    lowerTarget: bigint;
    upperTarget: bigint;
};

export class LinearPool implements BasePool {
    id: string;
    address: string;
    poolType: PoolType = PoolType.AaveLinear;
    poolTypeVersion: number;
    swapFee: bigint;
    tokens: Array<BPT | TokenAmount | WrappedToken>;
    mainToken: TokenAmount;
    wrappedToken: WrappedToken;
    bptToken: BPT;
    params: Params;

    static fromRawPool(pool: RawLinearPool): LinearPool {
        const orderedTokens = pool.tokens.sort((a, b) => a.index - b.index);
        const swapFee = BigInt(unsafeFastParseEther(pool.swapFee).toString());

        const mT = orderedTokens[pool.mainIndex];
        const mToken = new Token(1, mT.address, mT.decimals, mT.symbol, mT.name);
        const lowerTarget = TokenAmount.fromHumanAmount(mToken, pool.lowerTarget);
        const upperTarget = TokenAmount.fromHumanAmount(mToken, pool.upperTarget);
        const mTokenAmount = TokenAmount.fromHumanAmount(mToken, mT.balance);

        const wT = orderedTokens[pool.wrappedIndex];
        const wTRate = BigInt(unsafeFastParseEther(wT.priceRate || '1.0').toString());

        const wToken = new Token(1, wT.address, wT.decimals, wT.symbol, wT.name);
        const wTokenAmount = TokenAmount.fromHumanAmount(wToken, wT.balance);
        const wrappedToken = new WrappedToken(wToken, wTokenAmount.amount, wTRate);

        const bptIndex: number = orderedTokens.findIndex(t => t.address === pool.address);
        const bT = orderedTokens[bptIndex];
        const bToken = new Token(1, bT.address, bT.decimals, bT.symbol, bT.name);
        const bTokenAmount = TokenAmount.fromHumanAmount(bToken, bT.balance);
        const bptToken = new BPT(bToken, bTokenAmount.amount);

        const tokens: TokenAmount[] = [mTokenAmount, wrappedToken, bptToken];

        const params: Params = {
            fee: swapFee,
            rate: wTRate,
            lowerTarget: lowerTarget.scale18,
            upperTarget: upperTarget.scale18,
        };

        const linearPool = new LinearPool(
            pool.id,
            pool.poolTypeVersion,
            tokens,
            params,
            mTokenAmount,
            wrappedToken,
            bptToken,
        );
        return linearPool;
    }

    constructor(
        id: string,
        poolTypeVersion: number,
        tokens: Array<BPT | TokenAmount | WrappedToken>,
        params: Params,
        mainToken: TokenAmount,
        wrappedToken: WrappedToken,
        bptToken: BPT,
    ) {
        this.id = id;
        this.poolTypeVersion = poolTypeVersion;
        this.swapFee = params.fee;
        this.tokens = tokens;
        this.mainToken = mainToken;
        this.wrappedToken = wrappedToken;
        this.bptToken = bptToken;
        this.address = getPoolAddress(id);
        this.params = params;
    }

    public getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint {
        const tIn = this.tokens.find(t => t.token.address === tokenIn.address);
        const tOut = this.tokens.find(t => t.token.address === tokenOut.address);

        if (!tIn || !tOut) throw new Error('Pool does not contain the tokens provided');
        // TODO: Fix linear normalized liquidity calc
        return tOut.amount;
    }

    public swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        const tInIndex = this.tokens.findIndex(t => t.token.address === tokenIn.address);
        if (swapAmount.amount > this.tokens[tInIndex].amount)
            throw new Error('Swap amount exceeds the pool limit');

        if (tokenIn.isEqual(this.mainToken.token)) {
            if (tokenOut.isEqual(this.wrappedToken.token)) {
                return this._exactMainTokenInForWrappedOut(swapAmount);
            } else {
                return this._exactMainTokenInForBptOut(swapAmount);
            }
        } else if (tokenIn.isEqual(this.wrappedToken.token)) {
            if (tokenOut.isEqual(this.mainToken.token)) {
                return this._exactWrappedTokenInForMainOut(swapAmount);
            } else {
                return this._exactWrappedTokenInForBptOut(swapAmount);
            }
        } else if (tokenIn.isEqual(this.bptToken.token)) {
            if (tokenOut.isEqual(this.mainToken.token)) {
                return this._exactBptInForMainOut(swapAmount);
            } else {
                return this._exactBptInForWrappedOut(swapAmount);
            }
        } else {
            throw new Error('Pool does not contain the tokens provided');
        }
    }

    public swapGivenOut(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount): TokenAmount {
        const tOutIndex = this.tokens.findIndex(t => t.token.address === tokenOut.address);
        if (swapAmount.amount > this.tokens[tOutIndex].amount)
            throw new Error('Swap amount exceeds the pool limit');

        if (tokenIn.isEqual(this.mainToken.token)) {
            if (tokenOut.isEqual(this.wrappedToken.token)) {
                return this._mainTokenInForExactWrappedOut(swapAmount);
            } else {
                return this._mainTokenInForExactBptOut(swapAmount);
            }
        } else if (tokenIn.isEqual(this.wrappedToken.token)) {
            if (tokenOut.isEqual(this.mainToken.token)) {
                return this._wrappedTokenInForExactMainOut(swapAmount);
            } else {
                return this._wrappedTokenInForExactBptOut(swapAmount);
            }
        } else if (tokenIn.isEqual(this.bptToken.token)) {
            if (tokenOut.isEqual(this.mainToken.token)) {
                return this._bptInForExactMainOut(swapAmount);
            } else {
                return this._bptInForExactWrappedOut(swapAmount);
            }
        } else {
            throw new Error('Pool does not contain the tokens provided');
        }
    }

    private _exactMainTokenInForWrappedOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcWrappedOutPerMainIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.wrappedToken.token, tokenOutScale18);
    }

    private _exactMainTokenInForBptOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcBptOutPerMainIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.wrappedToken.scale18,
            this.bptToken.virtualBalance,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.bptToken.token, tokenOutScale18);
    }

    private _exactWrappedTokenInForMainOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcMainOutPerWrappedIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.mainToken.token, tokenOutScale18);
    }

    private _exactWrappedTokenInForBptOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcBptOutPerWrappedIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.wrappedToken.scale18,
            this.bptToken.virtualBalance,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.bptToken.token, tokenOutScale18);
    }

    private _exactBptInForMainOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcMainOutPerBptIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.wrappedToken.scale18,
            this.bptToken.virtualBalance,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.mainToken.token, tokenOutScale18);
    }

    private _exactBptInForWrappedOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcWrappedOutPerBptIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.wrappedToken.scale18,
            this.bptToken.virtualBalance,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.wrappedToken.token, tokenOutScale18);
    }

    private _mainTokenInForExactWrappedOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcWrappedOutPerMainIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.wrappedToken.token, tokenOutScale18);
    }

    private _mainTokenInForExactBptOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcBptOutPerMainIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.wrappedToken.scale18,
            this.bptToken.virtualBalance,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.bptToken.token, tokenOutScale18);
    }

    private _wrappedTokenInForExactMainOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcMainOutPerWrappedIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.mainToken.token, tokenOutScale18);
    }

    private _wrappedTokenInForExactBptOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcBptOutPerWrappedIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.wrappedToken.scale18,
            this.bptToken.virtualBalance,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.bptToken.token, tokenOutScale18);
    }

    private _bptInForExactMainOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcMainOutPerBptIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.wrappedToken.scale18,
            this.bptToken.virtualBalance,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.bptToken.token, tokenOutScale18);
    }

    private _bptInForExactWrappedOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcWrappedOutPerBptIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.wrappedToken.scale18,
            this.bptToken.virtualBalance,
            this.params,
        );

        return TokenAmount.fromScale18Amount(this.wrappedToken.token, tokenOutScale18);
    }
}
