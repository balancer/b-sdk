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
            name: 'HyperEVM Mainnet explorer',
            url: 'https://www.hyperscan.com/',
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
