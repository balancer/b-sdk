import { getAddress } from '@ethersproject/address';

export class Token {
    public readonly chainId: number;
    public readonly address: string;
    public readonly decimals: number;
    public readonly symbol?: string;
    public readonly name?: string;

    public constructor(
        chainId: number,
        address: string,
        decimals: number,
        symbol?: string,
        name?: string,
    ) {
        this.chainId = chainId;
        this.address = getAddress(address);
        this.decimals = decimals;
        this.symbol = symbol;
        this.name = name;
    }
}
