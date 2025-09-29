import { Address } from 'viem';
import { BaseToken } from './baseToken';

/**
 * Token extends BaseToken and adds wrapped token functionality
 * This maintains backward compatibility while providing a cleaner base class
 */
export class Token extends BaseToken {
    public readonly wrapped: Address;

    public constructor(
        chainId: number,
        address: Address,
        decimals: number,
        symbol?: string,
        name?: string,
        wrapped?: Address,
    ) {
        // Call parent constructor with core properties
        super(chainId, address, decimals, symbol, name);
        
        // Add wrapped functionality
        this.wrapped = (
            wrapped ? wrapped.toLowerCase() : address.toLowerCase()
        ) as Address;
    }

    public isUnderlyingEqual(token: Token) {
        return this.chainId === token.chainId && this.wrapped === token.wrapped;
    }
}
