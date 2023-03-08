import { Address } from 'viem';
import { Token } from '../entities/token';

export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000';
export const MAX_UINT112 = 5192296858534827628530496329220095n;
export const PREMINTED_STABLE_BPT = 2596148429267413814265248164610048n; // 2**111

export const SECONDS_PER_YEAR = 31536000n;

export enum ChainId {
    MAINNET = 1,
    GOERLI = 5,
    GNOSIS_CHAIN = 100,
    POLYGON = 137,
    ARBITRUM_ONE = 42161,
}

export const SUBGRAPH_URLS = {
    [ChainId.MAINNET]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    [ChainId.GOERLI]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2',
    [ChainId.GNOSIS_CHAIN]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-gnosis-chain-v2',
    [ChainId.POLYGON]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
    [ChainId.ARBITRUM_ONE]: `https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2`,
};

export const STELLATE_URLS = {
    [ChainId.MAINNET]: 'https://balancer-v2.stellate.balancer.fi',
    [ChainId.GOERLI]: 'https://balancer-goerli-v2.stellate.balancer.fi',
    [ChainId.GNOSIS_CHAIN]: 'https://balancer-gnosis-chain-v2.stellate.balancer.fi',
    [ChainId.POLYGON]: 'https://balancer-polygon-v2.stellate.balancer.fi',
    [ChainId.ARBITRUM_ONE]: 'https://balancer-arbitrum-v2.stellate.balancer.fi',
};

export const BALANCER_SOR_QUERIES_ADDRESS = '0x1814a3b3e4362caf4eb54cd85b82d39bd7b34e41';

export const NATIVE_ASSETS = {
    [ChainId.MAINNET]: new Token(
        ChainId.MAINNET,
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        18,
        'ETH',
        'Ether',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    ),
    [ChainId.GOERLI]: new Token(
        ChainId.GOERLI,
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        18,
        'ETH',
        'Ether',
        '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    ),
    [ChainId.GNOSIS_CHAIN]: new Token(
        ChainId.GNOSIS_CHAIN,
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        18,
        'xDAI',
        'xDAI',
        '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    ),
    [ChainId.POLYGON]: new Token(
        ChainId.POLYGON,
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        18,
        'MATIC',
        'Matic',
        '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    ),
    [ChainId.ARBITRUM_ONE]: new Token(
        ChainId.ARBITRUM_ONE,
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
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
