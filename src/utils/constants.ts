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
} from 'viem/chains';

export const ZERO_ADDRESS: Address =
    '0x0000000000000000000000000000000000000000';
/*
    Using empty account (undefined by default) in some multicall requests causes failures in some nodes
    More info: https://github.com/wevm/viem/issues/2792
*/
export const EMPTY_SENDER = { account: ZERO_ADDRESS };

const NATIVE_ADDRESS: Address = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

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
}

// The Balancer API requires the chain to be passed as a specific string
export const API_CHAIN_NAMES: Record<number, string> = {
    [ChainId.MAINNET]: 'MAINNET',
    [ChainId.OPTIMISM]: 'OPTIMISM',
    [ChainId.GNOSIS_CHAIN]: 'GNOSIS',
    [ChainId.POLYGON]: 'POLYGON',
    [ChainId.FANTOM]: 'FANTOM',
    [ChainId.FRAXTAL]: 'FRAXTAL',
    [ChainId.ZKSYNC]: 'ZKEVM',
    [ChainId.BASE]: 'BASE',
    [ChainId.MODE]: 'MODE',
    [ChainId.ARBITRUM_ONE]: 'ARBITRUM',
    [ChainId.AVALANCHE]: 'AVALANCHE',
    [ChainId.SEPOLIA]: 'SEPOLIA',
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
};

/**
 * Deployment Addresses
 * Source: https://docs.balancer.fi/reference/contracts
 */

export const BALANCER_RELAYER: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0x9B892E515D2Ab8869F17488d64B3b918731cc70d',
    [ChainId.AVALANCHE]: '0xA084c11cb55e67C9becf9607f1DBB20ec4D5E7b2',
    [ChainId.BASE]: '0x76f7204b62f554b79d444588edac9dfa7032c71a',
    [ChainId.BSC]: '0xf41D6De4bbE9919d87BC1E5cc3335549e2A1A6c0',
    [ChainId.FRAXTAL]: '0xb541765F540447646A9545E0A4800A0Bacf9E13D',
    [ChainId.GNOSIS_CHAIN]: '0x2163c2FcD0940e84B8a68991bF926eDfB0Cd926C',
    [ChainId.GOERLI]: '0x7f36A11750F225De646b0de7b26BC74e797c310B',
    [ChainId.MAINNET]: '0x35Cea9e57A393ac66Aaa7E25C391D52C74B5648f',
    [ChainId.MODE]: '0xb541765f540447646a9545e0a4800a0bacf9e13d',
    [ChainId.OPTIMISM]: '0x015ACA20a1422F3c729086c17f15F10e0CfbC75A',
    [ChainId.POLYGON]: '0xB1ED8d3b5059b3281D43306cC9D043cE8B22599b',
    [ChainId.SEPOLIA]: '0x7852fB9d0895e6e8b3EedA553c03F6e2F9124dF9',
    [ChainId.ZKEVM]: '0x8e620FfCa2580ed87241D7e10F85EE75d0a906F5',
};

export const VAULT: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    [ChainId.AVALANCHE]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    [ChainId.BASE]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    [ChainId.FANTOM]: '0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce',
    [ChainId.FRAXTAL]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    [ChainId.GNOSIS_CHAIN]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    [ChainId.MAINNET]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    [ChainId.MODE]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    [ChainId.OPTIMISM]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    [ChainId.POLYGON]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    [ChainId.ZKEVM]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    [ChainId.SEPOLIA]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
};

export const VAULT_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xBC582d2628FcD404254a1e12CB714967Ce428915',
    [ChainId.MAINNET]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.GNOSIS_CHAIN]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
};

export const VAULT_ADMIN: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x2AD9162D9b388b75eB40cBF996AbE8E968670c5C',
    [ChainId.MAINNET]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.GNOSIS_CHAIN]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
};

export const BALANCER_QUERIES: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
    [ChainId.AVALANCHE]: '0xC128468b7Ce63eA702C1f104D55A2566b13D3ABD',
    [ChainId.BASE]: '0x300ab2038eac391f26d9f895dc61f8f66a548833',
    [ChainId.FANTOM]: '0x1B0A42663DF1edeA171cD8732d288a81EFfF6d23',
    [ChainId.FRAXTAL]: '0x4132f7AcC9dB7A6cF7BE2Dd3A9DC8b30C7E6E6c8',
    [ChainId.GNOSIS_CHAIN]: '0x0f3e0c4218b7b0108a3643cfe9d3ec0d4f57c54e',
    [ChainId.MAINNET]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
    [ChainId.MODE]: '0x36caC20dd805d128c1a6Dd16eeA845C574b5A17C',
    [ChainId.OPTIMISM]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
    [ChainId.POLYGON]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
    [ChainId.ZKEVM]: '0x809b79b53f18e9bc08a961ed4678b901ac93213a',
    [ChainId.SEPOLIA]: '0x1802953277FD955f9a254B80Aa0582f193cF1d77',
};

export const WEIGHTED_POOL_FACTORY_BALANCER_V2: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0xc7e5ed1054a24ef31d827e6f86caa58b3bc168d7',
    [ChainId.AVALANCHE]: '0x230a59f4d9adc147480f03b0d3fffecd56c3289a',
    [ChainId.BASE]: '0x4c32a8a8fda4e24139b51b456b42290f51d6a1c4',
    [ChainId.FRAXTAL]: '0x9dA18982a33FD0c7051B19F0d7C76F2d5E7e017c',
    [ChainId.GNOSIS_CHAIN]: '0x6cad2ea22bfa7f4c14aae92e47f510cd5c509bc7',
    [ChainId.MAINNET]: '0x897888115ada5773e02aa29f775430bfb5f34c51',
    [ChainId.MODE]: '0xc3ccacE87f6d3A81724075ADcb5ddd85a8A1bB68',
    [ChainId.OPTIMISM]: '0x230a59f4d9adc147480f03b0d3fffecd56c3289a',
    [ChainId.POLYGON]: '0xfc8a407bba312ac761d8bfe04ce1201904842b76',
    [ChainId.ZKEVM]: '0x03f3fb107e74f2eac9358862e91ad3c692712054',
};

export const COMPOSABLE_STABLE_POOL_FACTORY: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0xa8920455934da4d853faac1f94fe7bef72943ef1',
    [ChainId.AVALANCHE]: '0xe42ffa682a26ef8f25891db4882932711d42e467',
    [ChainId.BASE]: '0x8df317a729fcaa260306d7de28888932cb579b88',
    [ChainId.FRAXTAL]: '0x4bdCc2fb18AEb9e2d281b0278D946445070EAda7',
    [ChainId.GNOSIS_CHAIN]: '0x4bdcc2fb18aeb9e2d281b0278d946445070eada7',
    [ChainId.MAINNET]: '0xdb8d758bcb971e482b2c45f7f8a7740283a1bd3a',
    [ChainId.MODE]: '0x5DbAd78818D4c8958EfF2d5b95b28385A22113Cd',
    [ChainId.OPTIMISM]: '0x043a2dad730d585c44fb79d2614f295d2d625412',
    [ChainId.POLYGON]: '0xe2fa4e1d17725e72dcdafe943ecf45df4b9e285b',
    [ChainId.ZKEVM]: '0x577e5993b9cc480f07f98b5ebd055604bd9071c4',
};

export const WEIGHTED_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x9aAD2c188b4eACcA85C44E7A9250dDADcae1A2E9',
};

export const STABLE_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xcB107E7075add7a95ae7192c052b4e6814bf0ad5',
};

export const BALANCER_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x4D2aA7a3CD7F8dA6feF37578A1881cD63Fd3715E',
};

export const BALANCER_BATCH_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x4232e5EEaA16Bcf483d93BEA469296B4EeF22503',
};

export const BALANCER_COMPOSITE_LIQUIDITY_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x2F118d8397D861354751709e1E0c14663e17F5C1',
};

export const BALANCER_BUFFER_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xD907aFAF02492e054D64da3A14312BdA356fc618',
};

export const PERMIT2: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
};

export const AUTHORIZER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xa331d84ec860bf466b4cdccfb4ac09a1b43f3ae6',
};

export const ADMIN_OF_AUTHORIZER = '0x171C0fF5943CE5f133130436A29bF61E26516003'; // do we plan to use same EoA for all chains?

/**
 * Native Assets
 */

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
};

export const ETH = NATIVE_ASSETS[ChainId.MAINNET];

export const DEFAULT_FUND_MANAGMENT = {
    sender: ZERO_ADDRESS,
    recipient: ZERO_ADDRESS,
    fromInternalBalance: false,
    toInternalBalance: false,
};

export const DEFAULT_USERDATA = '0x';

export const API_ENDPOINT = 'https://api-v3.balancer.fi';
export const TEST_API_ENDPOINT = 'https://test-api-v3.balancer.fi';
