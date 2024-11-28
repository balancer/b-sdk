import { PoolStateWithUnderlyings } from '@/entities';

export const boostedPool_USDC_USDT: PoolStateWithUnderlyings = {
    id: '0xd63db0b88dca565633fb8d70a70b9b8093d34a7e',
    address: '0xd63db0b88dca565633fb8d70a70b9b8093d34a7e',
    type: 'Stable',
    protocolVersion: 3,
    tokens: [
        {
            index: 0,
            address: '0x8a88124522dbbf1e56352ba3de1d9f78c143751e',
            decimals: 6,
            underlyingToken: {
                address: '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8',
                decimals: 6,
                index: 0,
            },
        },
        {
            index: 1,
            address: '0x978206fae13faf5a8d293fb614326b237684b750',
            decimals: 6,
            underlyingToken: {
                address: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
                decimals: 6,
                index: 1,
            },
        },
    ],
};
