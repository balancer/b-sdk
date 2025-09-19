import { defineChain } from 'viem';

export const monadTestnet = /*#__PURE__*/ defineChain({
    id: 10_143,
    name: 'Monad Testnet',
    nativeCurrency: {
        name: 'Testnet MON Token',
        symbol: 'MON',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://testnet-rpc.monad.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Monad Testnet explorer',
            url: 'https://testnet.monadexplorer.com',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 251449,
        },
    },
    testnet: true,
});

export const hyperEVM = /*#__PURE__*/ defineChain({
    id: 999,
    name: 'HyperEVM',
    nativeCurrency: {
        name: 'HYPE gas token',
        symbol: 'HYPE',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.hyperliquid.xyz/evm'],
        },
    },
    blockExplorers: {
        default: {
          name: 'Hyperscan',
          url: 'https://hyperevmscan.io',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 13051,
        },
    },
    testnet: false,
});

export const plasma = /*#__PURE__*/ defineChain({
    id: 9745,
    name: 'Plasma',
    nativeCurrency: {
        name: 'XPL',
        symbol: 'XPL',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.plasma.to'],
            webSocket: ['wss://rpc.plasma.to'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Plasma Explorer',
            url: 'https://plasmascan.to',
            apiUrl: 'https://api.routescan.io/v2/network/mainnet/evm/9745/etherscan/api?',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 1,
        },
    },
});
