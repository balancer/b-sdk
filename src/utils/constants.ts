export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export enum ChainId {
    MAINNET = 1,
    GOERLI = 5,
    POLYGON = 137,
    ARBITRUM_ONE = 42161,
}

export const SUBGRAPH_URLS = {
    [ChainId.MAINNET]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
    [ChainId.GOERLI]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-goerli-v2',
    [ChainId.POLYGON]:
        'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-prune-v2',
    [ChainId.ARBITRUM_ONE]: `https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2`,
};

export const DEFAULT_FUND_MANAGMENT = {
    sender: ZERO_ADDRESS,
    recipient: ZERO_ADDRESS,
    fromInternalBalance: false,
    toInternalBalance: false,
};

export const DEFAULT_USERDATA = '0x';
