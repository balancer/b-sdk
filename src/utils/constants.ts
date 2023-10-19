import { Address, Chain } from 'viem';
import { Token } from '../entities/token';
import {
    arbitrum,
    avalanche,
    baseGoerli,
    bsc,
    gnosis,
    goerli,
    mainnet,
    optimism,
    polygon,
    polygonZkEvm,
    zkSync,
    zkSyncTestnet,
} from 'viem/chains';

export const ZERO_ADDRESS: Address =
    '0x0000000000000000000000000000000000000000';
export const NATIVE_ADDRESS: Address =
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

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
    ZKSYNC_TESTNET = 280,
    ZKSYNC = 324,
    ZKEVM = 1101,
    ARBITRUM_ONE = 42161,
    AVALANCHE = 43114,
    BASE_GOERLI = 84531,
}

export const CHAINS: Record<number, Chain> = {
    [ChainId.MAINNET]: mainnet,
    [ChainId.GOERLI]: goerli,
    [ChainId.OPTIMISM]: optimism,
    [ChainId.BSC]: bsc,
    [ChainId.GNOSIS_CHAIN]: gnosis,
    [ChainId.POLYGON]: polygon,
    [ChainId.ZKSYNC_TESTNET]: zkSyncTestnet,
    [ChainId.ZKSYNC]: zkSync,
    [ChainId.ZKEVM]: polygonZkEvm,
    [ChainId.ARBITRUM_ONE]: arbitrum,
    [ChainId.AVALANCHE]: avalanche,
    [ChainId.BASE_GOERLI]: baseGoerli,
};

export const SUBGRAPH_URLS = {
    [ChainId.MAINNET]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    [ChainId.GOERLI]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2',
    [ChainId.OPTIMISM]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-optimism-v2',
    [ChainId.GNOSIS_CHAIN]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gnosis-chain-v2',
    [ChainId.POLYGON]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
    [ChainId.ZKSYNC_TESTNET]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-zktestnet-v2',
    [ChainId.ZKSYNC]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-zksync-v2',
    [ChainId.ZKEVM]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-zkevm-v2',
    [ChainId.ARBITRUM_ONE]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2',
    [ChainId.AVALANCHE]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-avalanche-v2',
    [ChainId.BASE_GOERLI]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-base-goerli-v2',
};

export const STELLATE_URLS = {
    [ChainId.MAINNET]: 'https://balancer-v2.stellate.balancer.fi',
    [ChainId.GOERLI]: 'https://balancer-goerli-v2.stellate.balancer.fi',
    [ChainId.GNOSIS_CHAIN]:
        'https://balancer-gnosis-chain-v2.stellate.balancer.fi',
    [ChainId.POLYGON]: 'https://balancer-polygon-v2.stellate.balancer.fi',
    [ChainId.ARBITRUM_ONE]: 'https://balancer-arbitrum-v2.stellate.balancer.fi',
};

export const BALANCER_QUERIES = '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5';
export const BALANCER_POOL_DATA_QUERIES_ADDRESSES: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0x7Ba29fE8E83dd6097A7298075C4AFfdBda3121cC',
    [ChainId.AVALANCHE]: '0x67af5D428d38C5176a286a2371Df691cDD914Fb8',
    [ChainId.GNOSIS_CHAIN]: '0x3f170631ed9821Ca51A59D996aB095162438DC10',
    [ChainId.MAINNET]: '0xf5CDdF6feD9C589f1Be04899F48f9738531daD59',
    [ChainId.OPTIMISM]: '0x6B5dA774890Db7B7b96C6f44e6a4b0F657399E2e',
    [ChainId.POLYGON]: '0x84813aA3e079A665C0B80F944427eE83cBA63617',
    [ChainId.ZKEVM]: '0xF24917fB88261a37Cc57F686eBC831a5c0B9fD39',
};

export const BALANCER_VAULT: Address =
    '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

export const BALANCER_RELAYER: Record<number, Address> = {
    [ChainId.MAINNET]: '0xc775bF567D67018dfFac4E89a7Cf10f0EDd0Be93',
};

export const BALANCER_HELPERS: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0x77d46184d22ca6a3726a2f500c776767b6a3d6ab',
    [ChainId.AVALANCHE]: '0x8e9aa87e45e92bad84d5f8dd1bff34fb92637de9',
    [ChainId.GNOSIS_CHAIN]: '0x8e9aa87e45e92bad84d5f8dd1bff34fb92637de9',
    [ChainId.MAINNET]: '0x5addcca35b7a0d07c74063c48700c8590e87864e',
    [ChainId.OPTIMISM]: '0x8e9aa87e45e92bad84d5f8dd1bff34fb92637de9',
    [ChainId.POLYGON]: '0x239e55f427d44c3cc793f49bfb507ebe76638a2b',
    [ChainId.ZKEVM]: '0x8e9aa87e45e92bad84d5f8dd1bff34fb92637de9',
};

export const NATIVE_ASSETS = {
    [ChainId.MAINNET]: new Token(
        ChainId.MAINNET,
        NATIVE_ADDRESS,
        18,
        'ETH',
        'Ether',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    ),
    [ChainId.GOERLI]: new Token(
        ChainId.GOERLI,
        NATIVE_ADDRESS,
        18,
        'ETH',
        'Ether',
        '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    ),
    [ChainId.GNOSIS_CHAIN]: new Token(
        ChainId.GNOSIS_CHAIN,
        NATIVE_ADDRESS,
        18,
        'xDAI',
        'xDAI',
        '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    ),
    [ChainId.POLYGON]: new Token(
        ChainId.POLYGON,
        NATIVE_ADDRESS,
        18,
        'MATIC',
        'Matic',
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    ),
    [ChainId.ARBITRUM_ONE]: new Token(
        ChainId.ARBITRUM_ONE,
        NATIVE_ADDRESS,
        18,
        'ETH',
        'Ether',
        '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    ),
};

export const ETH = NATIVE_ASSETS[ChainId.MAINNET];

export const DEFAULT_FUND_MANAGMENT = {
    sender: ZERO_ADDRESS,
    recipient: ZERO_ADDRESS,
    fromInternalBalance: false,
    toInternalBalance: false,
};

export const DEFAULT_USERDATA = '0x';
