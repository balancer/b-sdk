export class Token {
    public readonly chainId: number;
    public readonly address: string;
    public readonly decimals: number;
    public readonly symbol?: string;
    public readonly name?: string;
    public readonly wrapped: string;
    public readonly isNative: boolean;

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

        this.isNative =
            this.address === '0x0000000000000000000000000000000000000000' ? true : false;
        if (wrapped) {
            this.wrapped = wrapped.toLowerCase();
        } else {
            this.wrapped = address.toLowerCase();
        }
    }

    public isEqual(token: Token) {
        return this.chainId === token.chainId && this.address === token.address;
    }
}
