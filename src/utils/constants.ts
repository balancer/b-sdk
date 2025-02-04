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
    [ChainId.SONIC]: 'SONIC',
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
    [ChainId.SONIC]: '0xb5F8f253d0A6D4A18014cecA4253A2cEC6C98763',
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
    [ChainId.SONIC]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
};

export const VAULT_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.MAINNET]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.GNOSIS_CHAIN]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.SONIC]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.ARBITRUM_ONE]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.BASE]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
};

export const VAULT_ADMIN: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.MAINNET]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.GNOSIS_CHAIN]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.SONIC]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.ARBITRUM_ONE]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.BASE]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
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
    [ChainId.SONIC]: '0x4B29DB997Ec0efDFEF13bAeE2a2D7783bCf67f17',
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
    [ChainId.SONIC]: '0x22f5b7FDD99076f1f20f8118854ce3984544D56d',
};

export const COMPOSABLE_STABLE_POOL_FACTORY: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0x4bdCc2fb18AEb9e2d281b0278D946445070EAda7',
    [ChainId.AVALANCHE]: '0xb9F8AB3ED3F3aCBa64Bc6cd2DcA74B7F38fD7B88',
    [ChainId.BASE]: '0x956CCab09898C0AF2aCa5e6C229c3aD4E93d9288',
    [ChainId.FRAXTAL]: '0x4bdCc2fb18AEb9e2d281b0278D946445070EAda7',
    [ChainId.GNOSIS_CHAIN]: '0x47B489bf5836f83ABD928C316F8e39bC0587B020',
    [ChainId.MAINNET]: '0x5B42eC6D40f7B7965BE5308c70e2603c0281C1E9',
    [ChainId.MODE]: '0x5DbAd78818D4c8958EfF2d5b95b28385A22113Cd',
    [ChainId.OPTIMISM]: '0x4bdCc2fb18AEb9e2d281b0278D946445070EAda7',
    [ChainId.POLYGON]: '0xEAedc32a51c510d35ebC11088fD5fF2b47aACF2E',
    [ChainId.SEPOLIA]: '0x05503B3aDE04aCA81c8D6F88eCB73Ba156982D2B',
    [ChainId.ZKEVM]: '0xf23b4DB826DbA14c0e857029dfF076b1c0264843',
    [ChainId.SONIC]: '0x993767E29726dDb7F5e8A751fAF54d4b83F3FC62',
};

export const WEIGHTED_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x7532d5a3bE916e4a4D900240F49F0BABd4FD855C',
    [ChainId.MAINNET]: '0x201efd508c8DfE9DE1a13c2452863A78CB2a86Cc',
    [ChainId.GNOSIS_CHAIN]: '0xEB1eeaBF0126d813589C3D2CfeFFE410D9aE3863',
    [ChainId.SONIC]: '0x4726Eb55c37F0353F6d5011B5652d44A87d60fc3',
    [ChainId.ARBITRUM_ONE]: '0xD961E30156C2E0D0d925A0De45f931CB7815e970',
    [ChainId.BASE]: '0x5cF4928a3205728bd12830E1840F7DB85c62a4B9',
};

export const STABLE_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xd67F485C07D258B3e93835a3799d862ffcB55923',
    [ChainId.MAINNET]: '0xB9d01CA61b9C181dA1051bFDd28e1097e920AB14',
    [ChainId.GNOSIS_CHAIN]: '0x22625eEDd92c81a219A83e1dc48f88d54786B017',
    [ChainId.SONIC]: '0x815Ab57a5a2E4976cEC0b43C2D50CF26EF6F31Fd',
    [ChainId.ARBITRUM_ONE]: '0xEB1eeaBF0126d813589C3D2CfeFFE410D9aE3863',
    [ChainId.BASE]: '0xb9F8AB3ED3F3aCBa64Bc6cd2DcA74B7F38fD7B88',
};

export const BALANCER_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x0BF61f706105EA44694f2e92986bD01C39930280',
    [ChainId.MAINNET]: '0x5C6fb490BDFD3246EB0bB062c168DeCAF4bD9FDd',
    [ChainId.GNOSIS_CHAIN]: '0x84813aA3e079A665C0B80F944427eE83cBA63617',
    [ChainId.SONIC]: '0x6077b9801B5627a65A5eeE70697C793751D1a71c',
    [ChainId.ARBITRUM_ONE]: '0x0f08eEf2C785AA5e7539684aF04755dEC1347b7c',
    [ChainId.BASE]: '0x76578ecf9a141296Ec657847fb45B0585bCDa3a6',
};

export const BALANCER_BATCH_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xC85b652685567C1B074e8c0D4389f83a2E458b1C',
    [ChainId.MAINNET]: '0x136f1EFcC3f8f88516B9E94110D56FDBfB1778d1',
    [ChainId.GNOSIS_CHAIN]: '0xe2fa4e1d17725e72dcdAfe943Ecf45dF4B9E285b',
    [ChainId.SONIC]: '0x7761659F9e9834ad367e4d25E0306ba7A4968DAf',
    [ChainId.ARBITRUM_ONE]: '0xaD89051bEd8d96f045E8912aE1672c6C0bF8a85E',
    [ChainId.BASE]: '0x85a80afee867aDf27B50BdB7b76DA70f1E853062',
};

export const BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED: Record<
    number,
    Address
> = {
    [ChainId.SEPOLIA]: '0xc6674C0c7694E9b990eAc939E74F8cc3DD39B4b0',
    [ChainId.MAINNET]: '0x1CD776897ef4f647bf8241Ec69549e4A9cb1D608',
    [ChainId.GNOSIS_CHAIN]: '0xC1A64500E035D9159C8826E982dFb802003227f0',
    [ChainId.SONIC]: '0xcf21664262774eBB2C2b559e13b47F6cA10F3E65',
    [ChainId.ARBITRUM_ONE]: '0x1311Fbc9F60359639174c1e7cC2032DbDb5Cc4d1',
    [ChainId.BASE]: '0xf23b4DB826DbA14c0e857029dfF076b1c0264843',
};

export const BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED: Record<
    number,
    Address
> = {
    [ChainId.SEPOLIA]: '0x6A20a4b6DcFF78e6D21BF0dbFfD58C96644DB9cb',
};

export const BALANCER_BUFFER_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xb5F3A41515457CC6E2716c62a011D260441CcfC9',
    [ChainId.MAINNET]: '0x9179C06629ef7f17Cb5759F501D89997FE0E7b45',
    [ChainId.GNOSIS_CHAIN]: '0x86e67E115f96DF37239E0479441303De0de7bc2b',
    [ChainId.SONIC]: '0x532dA919D3EB5606b5867A6f505969c57F3A721b',
    [ChainId.ARBITRUM_ONE]: '0x311334883921Fb1b813826E585dF1C2be4358615',
    [ChainId.BASE]: '0x4132f7AcC9dB7A6cF7BE2Dd3A9DC8b30C7E6E6c8',
};

export const PERMIT2: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.MAINNET]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.GNOSIS_CHAIN]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.SONIC]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.ARBITRUM_ONE]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    [ChainId.BASE]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
};

// TODO: Figure out Authorizer addresses
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
    [ChainId.SONIC]: new Token(
        ChainId.SONIC,
        NATIVE_ADDRESS,
        18,
        'S',
        'Sonic',
        '0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38',
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
