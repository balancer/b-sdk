import { PoolStateWithUnderlyings } from '@/entities';

// mainnet

export const boostedPool_USDC_USDT: PoolStateWithUnderlyings = {
    id: '0x59fa488dda749cdd41772bb068bb23ee955a6d7a',
    address: '0x59fa488dda749cdd41772bb068bb23ee955a6d7a',
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

export const boostedPool_steakUSDC_csUSDL: PoolStateWithUnderlyings = {
    id: '0x5dd88b3aa3143173eb26552923922bdf33f50949',
    address: '0x5dd88b3aa3143173eb26552923922bdf33f50949',
    type: 'Stable',
    protocolVersion: 3,
    tokens: [
        {
            index: 0,
            address: '0xbeef01735c132ada46aa9aa4c54623caa92a64cb',
            decimals: 18,
            underlyingToken: {
                address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
                decimals: 6,
                index: 0,
            },
        },
        {
            index: 1,
            address: '0xbeefc01767ed5086f35decb6c00e6c12bc7476c1',
            decimals: 18,
            underlyingToken: {
                address: '0x7751e2f4b8ae93ef6b79d86419d42fe3295a4559', // wUSDL
                decimals: 18,
                index: 1,
            },
        },
    ],
};

// gnosis-chain

export const boostedPool_sDAI_BRLA: PoolStateWithUnderlyings = {
    id: '0xa91c3c043051e7e680b61d79b3a733d3e2c0fb5e',
    address: '0xa91c3c043051e7e680b61d79b3a733d3e2c0fb5e',
    type: 'Stable',
    protocolVersion: 3,
    tokens: [
        {
            index: 0,
            address: '0xaf204776c7245bf4147c2612bf6e5972ee483701',
            decimals: 18,
            underlyingToken: {
                address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d', // wxdai
                decimals: 18,
                index: 0,
            },
        },
        {
            index: 1,
            address: '0xfecb3f7c54e2caae9dc6ac9060a822d47e053760',
            decimals: 18,
            underlyingToken: null,
        },
    ],
};
