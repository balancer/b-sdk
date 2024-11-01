import { PoolStateWithUnderlyings } from '@/entities';

export const partialBoostedPool_USDT_stataDAI: PoolStateWithUnderlyings = {
    id: '0x31e7f3a9b9c834a752887723b017397e928d9ede',
    address: '0x31e7f3a9b9c834a752887723b017397e928d9ede',
    type: 'Stable',
    protocolVersion: 3,
    tokens: [
        {
            index: 0,
            address: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
            decimals: 6,
            underlyingToken: null,
        },
        {
            index: 1,
            address: '0xde46e43f46ff74a23a65ebb0580cbe3dfe684a17',
            decimals: 18,
            underlyingToken: {
                address: '0xff34b3d4aee8ddcd6f9afffb6fe49bd371b8a357',
                decimals: 18,
                index: 1,
            },
        },
    ],
    totalShares: '0',
};
