import { ChainId } from '@/utils/constants';

export const balancerV2Contracts = {
    Authorizer: {
        [ChainId.ARBITRUM_ONE]: '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6',
        [ChainId.AVALANCHE]: '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6',
        [ChainId.BASE]: '0x809B79b53F18E9bc08A961ED4678B901aC93213a',
        [ChainId.BSC]: '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6',
        [ChainId.FRAXTAL]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
        [ChainId.GNOSIS_CHAIN]: '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6',
        [ChainId.MAINNET]: '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6',
        [ChainId.MODE]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
        [ChainId.OPTIMISM]: '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6',
        [ChainId.POLYGON]: '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6',
        [ChainId.SEPOLIA]: '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6',
        [ChainId.SONIC]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
        [ChainId.ZKEVM]: '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6',
    },
    BalancerQueries: {
        [ChainId.ARBITRUM_ONE]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
        [ChainId.AVALANCHE]: '0xC128468b7Ce63eA702C1f104D55A2566b13D3ABD',
        [ChainId.BASE]: '0x300Ab2038EAc391f26D9F895dc61F8F66a548833',
        [ChainId.BSC]: '0x239e55F427D44C3cc793f49bFB507ebe76638a2b',
        [ChainId.FRAXTAL]: '0x4132f7AcC9dB7A6cF7BE2Dd3A9DC8b30C7E6E6c8',
        [ChainId.GNOSIS_CHAIN]: '0x0F3e0c4218b7b0108a3643cFe9D3ec0d4F57c54e',
        [ChainId.MAINNET]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
        [ChainId.MODE]: '0x36caC20dd805d128c1a6Dd16eeA845C574b5A17C',
        [ChainId.OPTIMISM]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
        [ChainId.POLYGON]: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
        [ChainId.SEPOLIA]: '0x1802953277FD955f9a254B80Aa0582f193cF1d77',
        [ChainId.SONIC]: '0x4B29DB997Ec0efDFEF13bAeE2a2D7783bCf67f17',
        [ChainId.ZKEVM]: '0x809B79b53F18E9bc08A961ED4678B901aC93213a',
    },
    BalancerRelayer: {
        [ChainId.ARBITRUM_ONE]: '0x9B892E515D2Ab8869F17488d64B3b918731cc70d',
        [ChainId.AVALANCHE]: '0xA084c11cb55e67C9becf9607f1DBB20ec4D5E7b2',
        [ChainId.BASE]: '0x7C3C773C878d2238a9b64d8CEE02377BF07ED06a',
        [ChainId.BSC]: '0xf41D6De4bbE9919d87BC1E5cc3335549e2A1A6c0',
        [ChainId.FRAXTAL]: '0xb541765F540447646A9545E0A4800A0Bacf9E13D',
        [ChainId.GNOSIS_CHAIN]: '0x2163c2FcD0940e84B8a68991bF926eDfB0Cd926C',
        [ChainId.MAINNET]: '0x35Cea9e57A393ac66Aaa7E25C391D52C74B5648f',
        [ChainId.MODE]: '0xb541765F540447646A9545E0A4800A0Bacf9E13D',
        [ChainId.OPTIMISM]: '0x015ACA20a1422F3c729086c17f15F10e0CfbC75A',
        [ChainId.POLYGON]: '0xB1ED8d3b5059b3281D43306cC9D043cE8B22599b',
        [ChainId.SEPOLIA]: '0x7852fB9d0895e6e8b3EedA553c03F6e2F9124dF9',
        [ChainId.SONIC]: '0x7b52D5ef006E59e3227629f97F182D6442380bb6',
        [ChainId.ZKEVM]: '0x8e620FfCa2580ed87241D7e10F85EE75d0a906F5',
    },
    ComposableStablePoolFactory: {
        [ChainId.ARBITRUM_ONE]: '0x4bdCc2fb18AEb9e2d281b0278D946445070EAda7',
        [ChainId.AVALANCHE]: '0xb9F8AB3ED3F3aCBa64Bc6cd2DcA74B7F38fD7B88',
        [ChainId.BASE]: '0x956CCab09898C0AF2aCa5e6C229c3aD4E93d9288',
        [ChainId.BSC]: '0x6B5dA774890Db7B7b96C6f44e6a4b0F657399E2e',
        [ChainId.FRAXTAL]: '0x4bdCc2fb18AEb9e2d281b0278D946445070EAda7',
        [ChainId.GNOSIS_CHAIN]: '0x47B489bf5836f83ABD928C316F8e39bC0587B020',
        [ChainId.MAINNET]: '0x5B42eC6D40f7B7965BE5308c70e2603c0281C1E9',
        [ChainId.MODE]: '0x5DbAd78818D4c8958EfF2d5b95b28385A22113Cd',
        [ChainId.OPTIMISM]: '0x4bdCc2fb18AEb9e2d281b0278D946445070EAda7',
        [ChainId.POLYGON]: '0xEAedc32a51c510d35ebC11088fD5fF2b47aACF2E',
        [ChainId.SEPOLIA]: '0x05503B3aDE04aCA81c8D6F88eCB73Ba156982D2B',
        [ChainId.SONIC]: '0x993767E29726dDb7F5e8A751fAF54d4b83F3FC62',
        [ChainId.ZKEVM]: '0xf23b4DB826DbA14c0e857029dfF076b1c0264843',
    },
    Vault: {
        [ChainId.ARBITRUM_ONE]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.AVALANCHE]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.BASE]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.BSC]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.FRAXTAL]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.GNOSIS_CHAIN]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.MAINNET]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.MODE]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.OPTIMISM]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.POLYGON]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.SEPOLIA]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.SONIC]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        [ChainId.ZKEVM]: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    },
    WeightedPoolFactory: {
        [ChainId.ARBITRUM_ONE]: '0xc7E5ED1054A24Ef31D827E6F86caA58B3Bc168d7',
        [ChainId.AVALANCHE]: '0x230a59F4d9ADc147480f03B0D3fFfeCd56c3289a',
        [ChainId.BASE]: '0x4C32a8a8fDa4E24139B51b456B42290f51d6A1c4',
        [ChainId.BSC]: '0x230a59F4d9ADc147480f03B0D3fFfeCd56c3289a',
        [ChainId.FRAXTAL]: '0x9dA18982a33FD0c7051B19F0d7C76F2d5E7e017c',
        [ChainId.GNOSIS_CHAIN]: '0x6CaD2ea22BFA7F4C14Aae92E47F510Cd5C509bc7',
        [ChainId.MAINNET]: '0x897888115Ada5773E02aA29F775430BFB5F34c51',
        [ChainId.MODE]: '0xc3ccacE87f6d3A81724075ADcb5ddd85a8A1bB68',
        [ChainId.OPTIMISM]: '0x230a59F4d9ADc147480f03B0D3fFfeCd56c3289a',
        [ChainId.POLYGON]: '0xFc8a407Bba312ac761D8BFe04CE1201904842B76',
        [ChainId.SEPOLIA]: '0x7920BFa1b2041911b354747CA7A6cDD2dfC50Cfd',
        [ChainId.SONIC]: '0x22f5b7FDD99076f1f20f8118854ce3984544D56d',
        [ChainId.ZKEVM]: '0x03F3Fb107e74F2EAC9358862E91ad3c692712054',
    },
} as const;
