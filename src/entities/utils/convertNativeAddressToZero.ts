import { Address } from '@/types';
import { NATIVE_ADDRESS, ZERO_ADDRESS } from '@/utils';

export const convertNativeAddressToZero = (address: Address): Address => {
    return address === NATIVE_ADDRESS ? ZERO_ADDRESS : address;
};
