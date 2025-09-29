import { Address } from 'viem';
import { InputToken } from '../types';

/**
 * BaseToken contains the core functionality for all tokens
 * This class handles the essential token properties and methods
 * without any wrapped token logic
 */
export class BaseToken {
    public readonly chainId: number;
    public readonly address: Address;
    public readonly decimals: number;
    public readonly symbol?: string;
    public readonly name?: string;

    public constructor(
        chainId: number,
        address: Address,
        decimals: number,
        symbol?: string,
        name?: string,
    ) {
        this.chainId = chainId;
        // Addresses are always lowercased for speed
        this.address = address.toLowerCase() as Address;
        this.decimals = decimals;
        this.symbol = symbol;
        this.name = name;
    }

    public isEqual(token: BaseToken) {
        return this.chainId === token.chainId && this.address === token.address;
    }

    public isSameAddress(address: Address) {
        return this.address === address.toLowerCase();
    }

    public toInputToken(): InputToken {
        return {
            address: this.address,
            decimals: this.decimals,
        };
    }
}
