import { Address } from 'viem';

interface ObjectWithAddress {
    token: Address;
}
// Sorts any array of objects by an 'address' param
export function sortByAddress<T extends ObjectWithAddress>(
    objectWithAddressArray: T[],
): T[] {
    return objectWithAddressArray.sort((a, b) =>
        a.token.toLowerCase().localeCompare(b.token.toLowerCase()),
    );
}
