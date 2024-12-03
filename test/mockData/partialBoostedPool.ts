import { PoolStateWithUnderlyings } from '@/entities';

export const partialBoostedPool_USDT_stataDAI: PoolStateWithUnderlyings = {
    id: '0xCE7601b157e0871332D2295F274a0f4314a1585D',
    address: '0xCE7601b157e0871332D2295F274a0f4314a1585D',
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
};

export const partialBoostedPool_WETH_stataUSDT: PoolStateWithUnderlyings = {
    id: '0xf5a25990da505a9d4c3e0d876f3951e9edf9abc3',
    address: '0xf5a25990da505a9d4c3e0d876f3951e9edf9abc3',
    type: 'Weighted',
    protocolVersion: 3,
    tokens: [
        {
            index: 0,
            address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
            decimals: 18,
            underlyingToken: null,
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
