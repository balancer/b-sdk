import { Address } from 'viem';
import { BaseToken } from './baseToken';

/**
 * NativeToken extends BaseToken and adds mandatory wrapped token functionality
 * This class is specifically designed for native tokens that always have a wrapped version
 */
export class NativeToken extends BaseToken {
    public readonly wrapped: Address;

    public constructor(
        chainId: number,
        address: Address,
        decimals: number,
        wrapped: Address,
        symbol?: string,
        name?: string,
    ) {
        // Call parent constructor with core properties
        super(chainId, address, decimals, symbol, name);

        // Set wrapped address (always mandatory for native tokens)
        this.wrapped = wrapped.toLowerCase() as Address;
    }

    public isUnderlyingEqual(token: NativeToken) {
        return this.chainId === token.chainId && this.wrapped === token.wrapped;
    }
}
