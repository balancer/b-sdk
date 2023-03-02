export class Token {
    public readonly chainId: number;
    public readonly address: string;
    public readonly decimals: number;
    public readonly symbol?: string;
    public readonly name?: string;
    public readonly wrapped: string;

    public constructor(
        chainId: number,
        address: string,
        decimals: number,
        symbol?: string,
        name?: string,
        wrapped?: string,
    ) {
        this.chainId = chainId;
        this.address = address.toLowerCase();
        this.decimals = decimals;
        this.symbol = symbol;
        this.name = name;

        wrapped ? (this.wrapped = wrapped.toLowerCase()) : (this.wrapped = address.toLowerCase());
    }

    public isEqual(token: Token) {
        return this.chainId === token.chainId && this.address === token.address;
    }

    public isUnderlyingEqual(token: Token) {
        return this.chainId === token.chainId && this.wrapped === token.wrapped;
    }
}
