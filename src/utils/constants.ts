import { Address, Chain } from 'viem';
import { Token } from '../entities/token';
import {
    arbitrum,
    avalanche,
    base,
    baseGoerli,
    bsc,
    gnosis,
    goerli,
    mainnet,
    optimism,
    polygon,
    polygonZkEvm,
    zkSync,
    fantom,
    sepolia,
    mode,
    fraxtal,
    sonic,
} from 'viem/chains';
import { monadTestnet, hyperEVM, plasma } from './customChains';
export const ZERO_ADDRESS: Address =
    '0x0000000000000000000000000000000000000000';
/*
    Using empty account (undefined by default) in some multicall requests causes failures in some nodes
    More info: https://github.com/wevm/viem/issues/2792
*/
export const EMPTY_SENDER = { account: ZERO_ADDRESS };

const NATIVE_ADDRESS: Address = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const HYPEREVM_NATIVE_ADDRESS: Address =
    '0x2222222222222222222222222222222222222222';

export const MAX_UINT112 = 5192296858534827628530496329220095n;
export const MAX_UINT256 =
    115792089237316195423570985008687907853269984665640564039457584007913129639935n;
export const PREMINTED_STABLE_BPT = 2596148429267413814265248164610048n; // 2**111

export const DECIMAL_SCALES = {
    0: 1n,
    1: 10n,
    2: 100n,
    3: 1000n,
    4: 10000n,
    5: 100000n,
    6: 1000000n,
    7: 10000000n,
    8: 100000000n,
    9: 1000000000n,
    10: 10000000000n,
    11: 100000000000n,
    12: 1000000000000n,
    13: 10000000000000n,
    14: 100000000000000n,
    15: 1000000000000000n,
    16: 10000000000000000n,
    17: 100000000000000000n,
    18: 1000000000000000000n,
};

export const SECONDS_PER_YEAR = 31536000n;

export enum ChainId {
    MAINNET = 1,
    GOERLI = 5,
    OPTIMISM = 10,
    BSC = 56,
    GNOSIS_CHAIN = 100,
    POLYGON = 137,
    SONIC = 146,
    ZKSYNC_TESTNET = 280,
    FANTOM = 250,
    FRAXTAL = 252,
    ZKSYNC = 324,
    ZKEVM = 1101,
    BASE = 8453,
    MODE = 34443,
    ARBITRUM_ONE = 42161,
    AVALANCHE = 43114,
    BASE_GOERLI = 84531,
    SEPOLIA = 11155111,
    MONAD_TESTNET = 10143,
    HYPEREVM = 999,
    PLASMA = 9745
}

// The Balancer API requires the chain to be passed as a specific string
export const API_CHAIN_NAMES: Record<number, string> = {
    [ChainId.MAINNET]: 'MAINNET',
    [ChainId.OPTIMISM]: 'OPTIMISM',
    [ChainId.GNOSIS_CHAIN]: 'GNOSIS',
    [ChainId.POLYGON]: 'POLYGON',
    [ChainId.FANTOM]: 'FANTOM',
    [ChainId.FRAXTAL]: 'FRAXTAL',
    [ChainId.ZKSYNC]: 'ZKSYNC',
    [ChainId.ZKEVM]: 'ZKEVM',
    [ChainId.BASE]: 'BASE',
    [ChainId.MODE]: 'MODE',
    [ChainId.ARBITRUM_ONE]: 'ARBITRUM',
    [ChainId.AVALANCHE]: 'AVALANCHE',
    [ChainId.SEPOLIA]: 'SEPOLIA',
    [ChainId.SONIC]: 'SONIC',
    [ChainId.MONAD_TESTNET]: 'MONAD_TESTNET',
    [ChainId.HYPEREVM]: 'HYPEREVM',
    [ChainId.PLASMA]: 'PLASMA',
};

export const CHAINS: Record<number, Chain> = {
    [ChainId.MAINNET]: mainnet,
    [ChainId.GOERLI]: goerli,
    [ChainId.OPTIMISM]: optimism,
    [ChainId.BSC]: bsc,
    [ChainId.GNOSIS_CHAIN]: gnosis,
    [ChainId.POLYGON]: polygon,
    [ChainId.FANTOM]: fantom,
    [ChainId.FRAXTAL]: fraxtal,
    [ChainId.ZKSYNC]: zkSync,
    [ChainId.ZKEVM]: polygonZkEvm,
    [ChainId.BASE]: base,
    [ChainId.MODE]: mode,
    [ChainId.ARBITRUM_ONE]: arbitrum,
    [ChainId.AVALANCHE]: avalanche,
    [ChainId.BASE_GOERLI]: baseGoerli,
    [ChainId.SEPOLIA]: sepolia,
    [ChainId.SONIC]: sonic,
    [ChainId.MONAD_TESTNET]: monadTestnet,
    [ChainId.HYPEREVM]: hyperEVM,
    [ChainId.PLASMA]: plasma
};

export const PERMIT2: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.MAINNET]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.GNOSIS_CHAIN]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.SONIC]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.ARBITRUM_ONE]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.BASE]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.MONAD_TESTNET]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.AVALANCHE]: '0x000000000022d473030f116ddee9f6b43ac78ba3',
    [ChainId.OPTIMISM]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.HYPEREVM]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
};

export const NATIVE_ASSETS = {
    [ChainId.ARBITRUM_ONE]: new Token(
        ChainId.ARBITRUM_ONE,
        NATIVE_ADDRESS,
        18,
        'ETH',
        'Ether',
        '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    ),
    [ChainId.BASE]: new Token(
        ChainId.BASE,
        NATIVE_ADDRESS,
        18,
        'ETH',
        'Ether',
        '0x4200000000000000000000000000000000000006',
    ),
    [ChainId.FANTOM]: new Token(
        ChainId.FANTOM,
        NATIVE_ADDRESS,
        18,
        'FANTOM',
        'Fantom',
        '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83',
    ),
    [ChainId.FRAXTAL]: new Token(
        ChainId.FRAXTAL,
        NATIVE_ADDRESS,
        18,
        'FRAXTAL',
        'Fraxtal',
        '0xfc00000000000000000000000000000000000006',
    ),
    [ChainId.GNOSIS_CHAIN]: new Token(
        ChainId.GNOSIS_CHAIN,
        NATIVE_ADDRESS,
        18,
        'xDAI',
        'xDAI',
        '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    ),
    [ChainId.GOERLI]: new Token(
        ChainId.GOERLI,
        NATIVE_ADDRESS,
        18,
        'ETH',
        'Ether',
        '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    ),
    [ChainId.MAINNET]: new Token(
        ChainId.MAINNET,
        NATIVE_ADDRESS,
        18,
        'ETH',
        'Ether',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    ),
    [ChainId.MODE]: new Token(
        ChainId.MODE,
        NATIVE_ADDRESS,
        18,
        'ETH',
        'Ether',
        '0x4200000000000000000000000000000000000006',
    ),
    [ChainId.OPTIMISM]: new Token(
        ChainId.OPTIMISM,
        NATIVE_ADDRESS,
        18,
        'ETH',
        'Ether',
        '0x4200000000000000000000000000000000000006',
    ),
    [ChainId.POLYGON]: new Token(
        ChainId.POLYGON,
        NATIVE_ADDRESS,
        18,
        'MATIC',
        'Matic',
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    ),
    [ChainId.SEPOLIA]: new Token(
        ChainId.SEPOLIA,
        NATIVE_ADDRESS,
        18,
        'ETH',
        'Ether',
        '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
    ),
    [ChainId.AVALANCHE]: new Token(
        ChainId.AVALANCHE,
        NATIVE_ADDRESS,
        18,
        'AVAX',
        'Avax',
        '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    ),
    [ChainId.ZKEVM]: new Token(
        ChainId.ZKEVM,
        NATIVE_ADDRESS,
        18,
        'MATIC',
        'Matic',
        '0xa2036f0538221a77a3937f1379699f44945018d0',
    ),
    [ChainId.SONIC]: new Token(
        ChainId.SONIC,
        NATIVE_ADDRESS,
        18,
        'S',
        'Sonic',
        '0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38',
    ),
    [ChainId.HYPEREVM]: new Token(
        ChainId.HYPEREVM,
        HYPEREVM_NATIVE_ADDRESS,
        18,
        'HYPE',
        'Hype',
        '0x5555555555555555555555555555555555555555',
    ),
    [ChainId.PLASMA]: new Token(
        ChainId.PLASMA,
        NATIVE_ADDRESS,
        18,
        'XPL',
        'Xpl',
        '0x6100E367285b01F48D07953803A2d8dCA5D19873',
    ),
};

export const DEFAULT_USERDATA = '0x';

export const API_ENDPOINT = 'https://api-v3.balancer.fi';
export const TEST_API_ENDPOINT = 'https://test-api-v3.balancer.fi';
