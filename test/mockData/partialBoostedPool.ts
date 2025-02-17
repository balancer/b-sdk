import { PoolStateWithUnderlyings } from '@/entities';

export const partialBoostedPool_USDT_stataDAI: PoolStateWithUnderlyings = {
    id: '0x070810362cb6fd4b44f87a225ab0c20aeb194a63',
    address: '0x070810362cb6fd4b44f87a225ab0c20aeb194a63',
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
    id: '0x445A49D1Ad280B68026629fE029Ed0Fbef549a94',
    address: '0x445A49D1Ad280B68026629fE029Ed0Fbef549a94',
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

export const partialBoostedPool_USDT_USDX_sUSDX: PoolStateWithUnderlyings = {
    id: '0xc2b0d1a1b4cdda10185859b5a5c543024c2df869',
    address: '0xc2b0d1a1b4cdda10185859b5a5c543024c2df869',
    type: 'Stable',
    protocolVersion: 3,
    tokens: [
        {
            index: 0, //susdx
            address: '0x7788a3538c5fc7f9c7c8a74eac4c898fc8d87d92',
            decimals: 18,
            underlyingToken: {
                address: "0xf3527ef8de265eaa3716fb312c12847bfba66cef",
                decimals: 18,
                index: 0,
          }
        },
        {
            index: 1, //wa arbitrum usdt
            address: '0xa6d12574efb239fc1d2099732bd8b5dc6306897f',
            decimals: 6,
            underlyingToken: {
                address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
                decimals: 6,
                index: 1,
            },
        },
        {
            index: 2, //usdx
            address: '0xf3527ef8de265eaa3716fb312c12847bfba66cef',
            decimals: 18,
            underlyingToken: null
        }
    ],
};
