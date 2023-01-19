import { parseEther } from '@ethersproject/units';
import { PoolType, SwapKind } from '../../types';
import { Token, TokenAmount, BigintIsh } from '../../entities/';
import { BasePool } from './';
import { SubgraphPool } from '../../poolProvider';
import { BONE, MathSol, getPoolAddress } from '../../utils';
import { _calcWrappedOutPerMainIn, _calcBptOutPerMainIn, _calcMainOutPerWrappedIn, _calcBptOutPerWrappedIn } from './linearMath';

export class BPT extends TokenAmount {
    public readonly rate: bigint;
    public readonly virtualBalance: bigint;

    public constructor(token: Token, amount: BigintIsh) {
        super(token, amount);
        this.rate = 1n;
        this.virtualBalance = 0n;
    }
}

export class WrappedToken extends TokenAmount {
    public readonly rate: bigint;
    
    public constructor(token: Token, amount: BigintIsh, rate: BigintIsh) {
        super(token, amount);
        this.rate = BigInt(rate);
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
    tokens: Array<BPT | TokenAmount | WrappedToken>;
    mainToken: TokenAmount;
    wrappedToken: WrappedToken;
    bptToken: BPT;
    params: Params;
    // TODO: Stable limits
    MAX_IN_RATIO = BigInt('300000000000000000'); // 0.3
    MAX_OUT_RATIO = BigInt('300000000000000000'); // 0.3

    static fromRawPool(pool: SubgraphPool): LinearPool {
        const swapFee = BigInt(parseEther(pool.swapFee).toString());
        
        const mT = pool.tokens[pool.mainIndex];
        const mToken = new Token(1, mT.address, mT.decimals, mT.symbol, mT.name);
        const lowerTarget = TokenAmount.fromHumanAmount(mToken, pool.lowerTarget);
        const upperTarget = TokenAmount.fromHumanAmount(mToken, pool.upperTarget);
        const mTokenAmount = TokenAmount.fromHumanAmount(mToken, mT.balance);

        const wT = pool.tokens[pool.wrappedIndex];
        if (!wT.priceRate) throw new Error('Wrapped pool token does not have a price rate');
        const rate = BigInt(parseEther(wT.priceRate).toString());
        const wToken = new Token(1, wT.address, wT.decimals, wT.symbol, wT.name);
        const wTokenAmount = TokenAmount.fromHumanAmount(wToken, wT.balance);
        const wrappedToken = new WrappedToken(wToken, wTokenAmount.amount, parseEther(wT.priceRate).toString());

        const bptIndex: number = pool.tokens.findIndex(t => t.address === pool.address);
        const bT = pool.tokens[bptIndex];
        const bToken = new Token(1, bT.address, bT.decimals, bT.symbol, bT.name);
        const bTokenAmount = TokenAmount.fromHumanAmount(bToken, bT.balance);
        const bptToken = new BPT(bToken, bTokenAmount.amount);

        const params: Params = {
            fee: swapFee,
            rate: rate,
            lowerTarget: lowerTarget.scale18,
            upperTarget: upperTarget.scale18,
        };

        const linearPool = new LinearPool(
            pool.id,
            pool.poolTypeVersion,
            swapFee,
            mainToken,
            wrappedToken,
            bptToken,
        );
        return linearPool;
    }

    constructor(id: string, poolTypeVersion: number, params: Params, mainToken: MainToken, wrappedToken: WrappedToken, bptToken: BPT) {
        this.id = id;
        this.poolTypeVersion = poolTypeVersion;
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
        }
    }

    private _exactMainTokenInForWrappedOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcWrappedOutPerMainIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.params
        );

        return TokenAmount.fromScale18Amount(this.wrappedToken.token, tokenOutScale18);
    }

    private _exactMainTokenInForBptOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcBptOutPerMainIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.wrappedToken.scale18,
            this.bptToken.virtualBalance,
            this.params
        );

        return TokenAmount.fromScale18Amount(this.bptToken.token, tokenOutScale18);
    }

    private _exactWrappedTokenInForMainOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcMainOutPerWrappedIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.params
        );

        return TokenAmount.fromScale18Amount(this.mainToken.token, tokenOutScale18);
    }

    private _exactWrappedTokenInForBptOut(swapAmount: TokenAmount): TokenAmount {
        const tokenOutScale18 = _calcBptOutPerWrappedIn(
            swapAmount.scale18,
            this.mainToken.scale18,
            this.wrappedToken.scale18,
            this.bptToken.virtualBalance,
            this.params
        );

        return TokenAmount.fromScale18Amount(this.bptToken.token, tokenOutScale18);
    }

    public subtractSwapFeeAmount(amount: TokenAmount): TokenAmount {
        const feeAmount = amount.mulFixed(this.swapFee);
        return amount.sub(feeAmount);
    }
}
