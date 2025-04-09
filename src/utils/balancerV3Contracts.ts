import { ChainId } from '@/utils/constants';

export const balancerV3Contracts = {
    VaultAdmin: {
        [ChainId.ARBITRUM_ONE]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
        [ChainId.AVALANCHE]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
        [ChainId.BASE]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
        [ChainId.GNOSIS_CHAIN]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
        [ChainId.MAINNET]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
        [ChainId.OPTIMISM]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
        [ChainId.SEPOLIA]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
        [ChainId.SONIC]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    },
    VaultExtension: {
        [ChainId.ARBITRUM_ONE]: '0x0E8B07657D719B86e06bF0806D6729e3D528C9A9',
        [ChainId.AVALANCHE]: '0x0E8B07657D719B86e06bF0806D6729e3D528C9A9',
        [ChainId.BASE]: '0x0E8B07657D719B86e06bF0806D6729e3D528C9A9',
        [ChainId.GNOSIS_CHAIN]: '0x0E8B07657D719B86e06bF0806D6729e3D528C9A9',
        [ChainId.MAINNET]: '0x0E8B07657D719B86e06bF0806D6729e3D528C9A9',
        [ChainId.OPTIMISM]: '0x0E8B07657D719B86e06bF0806D6729e3D528C9A9',
        [ChainId.SEPOLIA]: '0x0E8B07657D719B86e06bF0806D6729e3D528C9A9',
        [ChainId.SONIC]: '0x0E8B07657D719B86e06bF0806D6729e3D528C9A9',
    },
    Vault: {
        [ChainId.ARBITRUM_ONE]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
        [ChainId.AVALANCHE]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
        [ChainId.BASE]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
        [ChainId.GNOSIS_CHAIN]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
        [ChainId.MAINNET]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
        [ChainId.OPTIMISM]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
        [ChainId.SEPOLIA]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
        [ChainId.SONIC]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    },
    BatchRouter: {
        [ChainId.ARBITRUM_ONE]: '0xaD89051bEd8d96f045E8912aE1672c6C0bF8a85E',
        [ChainId.AVALANCHE]: '0xc9b36096f5201ea332Db35d6D195774ea0D5988f',
        [ChainId.BASE]: '0x85a80afee867aDf27B50BdB7b76DA70f1E853062',
        [ChainId.GNOSIS_CHAIN]: '0xe2fa4e1d17725e72dcdAfe943Ecf45dF4B9E285b',
        [ChainId.MAINNET]: '0x136f1EFcC3f8f88516B9E94110D56FDBfB1778d1',
        [ChainId.OPTIMISM]: '0xaD89051bEd8d96f045E8912aE1672c6C0bF8a85E',
        [ChainId.SEPOLIA]: '0xC85b652685567C1B074e8c0D4389f83a2E458b1C',
        [ChainId.SONIC]: '0x7761659F9e9834ad367e4d25E0306ba7A4968DAf',
    },
    BufferRouter: {
        [ChainId.ARBITRUM_ONE]: '0x311334883921Fb1b813826E585dF1C2be4358615',
        [ChainId.AVALANCHE]: '0x22625eEDd92c81a219A83e1dc48f88d54786B017',
        [ChainId.BASE]: '0x4132f7AcC9dB7A6cF7BE2Dd3A9DC8b30C7E6E6c8',
        [ChainId.GNOSIS_CHAIN]: '0x86e67E115f96DF37239E0479441303De0de7bc2b',
        [ChainId.MAINNET]: '0x9179C06629ef7f17Cb5759F501D89997FE0E7b45',
        [ChainId.OPTIMISM]: '0x311334883921Fb1b813826E585dF1C2be4358615',
        [ChainId.SEPOLIA]: '0xb5F3A41515457CC6E2716c62a011D260441CcfC9',
        [ChainId.SONIC]: '0x532dA919D3EB5606b5867A6f505969c57F3A721b',
    },
    WeightedPoolFactory: {
        [ChainId.ARBITRUM_ONE]: '0xD961E30156C2E0D0d925A0De45f931CB7815e970',
        [ChainId.AVALANCHE]: '0xD961E30156C2E0D0d925A0De45f931CB7815e970',
        [ChainId.BASE]: '0x5cF4928a3205728bd12830E1840F7DB85c62a4B9',
        [ChainId.GNOSIS_CHAIN]: '0xEB1eeaBF0126d813589C3D2CfeFFE410D9aE3863',
        [ChainId.MAINNET]: '0x201efd508c8DfE9DE1a13c2452863A78CB2a86Cc',
        [ChainId.OPTIMISM]: '0x0f08eEf2C785AA5e7539684aF04755dEC1347b7c',
        [ChainId.SEPOLIA]: '0x7532d5a3bE916e4a4D900240F49F0BABd4FD855C',
        [ChainId.SONIC]: '0x4726Eb55c37F0353F6d5011B5652d44A87d60fc3',
    },
    CompositeLiquidityRouter: {
        [ChainId.ARBITRUM_ONE]: '0xC1A64500E035D9159C8826E982dFb802003227f0',
        [ChainId.AVALANCHE]: '0x0C8f71D19f87c0bD1b9baD2484EcC3388D5DbB98',
        [ChainId.BASE]: '0x9dA18982a33FD0c7051B19F0d7C76F2d5E7e017c',
        [ChainId.GNOSIS_CHAIN]: '0x6eaD84Af26E997D27998Fc9f8614e8a19BB93938',
        [ChainId.MAINNET]: '0xb21A277466e7dB6934556a1Ce12eb3F032815c8A',
        [ChainId.OPTIMISM]: '0xc9b36096f5201ea332Db35d6D195774ea0D5988f',
        [ChainId.SEPOLIA]: '0x6A20a4b6DcFF78e6D21BF0dbFfD58C96644DB9cb',
        [ChainId.SONIC]: '0xE42FFA682A26EF8F25891db4882932711D42e467',
    },
    GyroECLPPoolFactory: {
        [ChainId.ARBITRUM_ONE]: '0x88ED12A90142fDBFe2a28f7d5b48927254C7e760',
        [ChainId.AVALANCHE]: '0x268E2EE1413D768b6e2dc3F5a4ddc9Ae03d9AF42',
        [ChainId.BASE]: '0x5F6848976C2914403B425F18B589A65772F082E3',
        [ChainId.GNOSIS_CHAIN]: '0xEa924b45a3fcDAAdf4E5cFB1665823B8F8F2039B',
        [ChainId.MAINNET]: '0xE9B0a3bc48178D7FE2F5453C8bc1415d73F966d0',
        [ChainId.OPTIMISM]: '0x22625eEDd92c81a219A83e1dc48f88d54786B017',
        [ChainId.SEPOLIA]: '0x589cA6855C348d831b394676c25B125BcdC7F8ce',
        [ChainId.SONIC]: '0xf023731dD8758D7C869af10005e6380Cb57775a9',
    },
    LBPoolFactory: {
        [ChainId.ARBITRUM_ONE]: '0x4BB42f71CAB7Bd13e9f958dA4351B9fa2d3A42FF',
        [ChainId.AVALANCHE]: '0x3BEb058DE1A25dd24223fd9e1796df8589429AcE',
        [ChainId.BASE]: '0x662112B8CB18889e81459b92CA0f894a2ef2c1B8',
        [ChainId.GNOSIS_CHAIN]: '0x6eE18fbb1BBcC5CF700cD75ea1aef2bb21e3cB3F',
        [ChainId.MAINNET]: '0x4eff2d77D9fFbAeFB4b141A3e494c085b3FF4Cb5',
        [ChainId.OPTIMISM]: '0xC1A64500E035D9159C8826E982dFb802003227f0',
        [ChainId.SEPOLIA]: '0xA714753434481DbaBf7921963f18190636eCde69',
    },
    Router: {
        [ChainId.ARBITRUM_ONE]: '0xEAedc32a51c510d35ebC11088fD5fF2b47aACF2E',
        [ChainId.AVALANCHE]: '0xF39CA6ede9BF7820a952b52f3c94af526bAB9015',
        [ChainId.BASE]: '0x3f170631ed9821Ca51A59D996aB095162438DC10',
        [ChainId.GNOSIS_CHAIN]: '0x4eff2d77D9fFbAeFB4b141A3e494c085b3FF4Cb5',
        [ChainId.MAINNET]: '0xAE563E3f8219521950555F5962419C8919758Ea2',
        [ChainId.OPTIMISM]: '0xe2fa4e1d17725e72dcdAfe943Ecf45dF4B9E285b',
        [ChainId.SEPOLIA]: '0x5e315f96389C1aaF9324D97d3512ae1e0Bf3C21a',
        [ChainId.SONIC]: '0x93db4682A40721e7c698ea0a842389D10FA8Dae5',
    },
    StablePoolFactory: {
        [ChainId.ARBITRUM_ONE]: '0x44d33798dddCdAbc93Fe6a40C80588033Dc502d3',
        [ChainId.AVALANCHE]: '0xEAedc32a51c510d35ebC11088fD5fF2b47aACF2E',
        [ChainId.BASE]: '0xC49Ca921c4CD1117162eAEEc0ee969649997950c',
        [ChainId.GNOSIS_CHAIN]: '0x161f4014C27773840ccb4EC1957113e6DD028846',
        [ChainId.MAINNET]: '0xe42C2E153BB0A8899b59C73F5Ff941f9742F1197',
        [ChainId.OPTIMISM]: '0x268E2EE1413D768b6e2dc3F5a4ddc9Ae03d9AF42',
        [ChainId.SEPOLIA]: '0xc274A11E09a3c92Ac64eAff5bEC4ee8f5dfEe207',
        [ChainId.SONIC]: '0x482eE54595f79B6BA34b75754A4983134148Affb',
    },
    StableSurgePoolFactory: {
        [ChainId.ARBITRUM_ONE]: '0x201efd508c8DfE9DE1a13c2452863A78CB2a86Cc',
        [ChainId.AVALANCHE]: '0x18CC3C68A5e64b40c846Aa6E45312cbcBb94f71b',
        [ChainId.BASE]: '0x8e3fEaAB11b7B351e3EA1E01247Ab6ccc847dD52',
        [ChainId.GNOSIS_CHAIN]: '0x45fB5aF0a1aD80Ea16C803146eb81844D9972373',
        [ChainId.MAINNET]: '0x355bD33F0033066BB3DE396a6d069be57353AD95',
        [ChainId.OPTIMISM]: '0x3BEb058DE1A25dd24223fd9e1796df8589429AcE',
        [ChainId.SEPOLIA]: '0x2f1d6F4C40047dC122cA7e46B0D1eC27739BFc66',
        [ChainId.SONIC]: '0x6187F6C78ca4d89490d959e9c629B93214e6776e',
    },
} as const;
