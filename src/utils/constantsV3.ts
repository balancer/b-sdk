import { Address } from 'viem';
import { ChainId } from './constants';

// V3
export const VAULT_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.MAINNET]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.GNOSIS_CHAIN]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.SONIC]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.ARBITRUM_ONE]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.BASE]: '0xbA1333333333a1BA1108E8412f11850A5C319bA9',
    [ChainId.MONAD_TESTNET]: '0xd07101ebD191C366D5A177cA67826014B0E42Ae3',
};

// V3
export const VAULT_ADMIN: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.MAINNET]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.GNOSIS_CHAIN]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.SONIC]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.ARBITRUM_ONE]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.BASE]: '0x35fFB749B273bEb20F40f35EdeB805012C539864',
    [ChainId.MONAD_TESTNET]: '0x9F1f11a414AF861bef8108B3cE2Cbc43DEBB3165',
};

// V3
export const WEIGHTED_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x7532d5a3bE916e4a4D900240F49F0BABd4FD855C',
    [ChainId.MAINNET]: '0x201efd508c8DfE9DE1a13c2452863A78CB2a86Cc',
    [ChainId.GNOSIS_CHAIN]: '0xEB1eeaBF0126d813589C3D2CfeFFE410D9aE3863',
    [ChainId.SONIC]: '0x4726Eb55c37F0353F6d5011B5652d44A87d60fc3',
    [ChainId.ARBITRUM_ONE]: '0xD961E30156C2E0D0d925A0De45f931CB7815e970',
    [ChainId.BASE]: '0x5cF4928a3205728bd12830E1840F7DB85c62a4B9',
    [ChainId.MONAD_TESTNET]: '0xf23b4DB826DbA14c0e857029dfF076b1c0264843',
};

// V3
export const STABLE_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xd67F485C07D258B3e93835a3799d862ffcB55923',
    [ChainId.MAINNET]: '0xB9d01CA61b9C181dA1051bFDd28e1097e920AB14',
    [ChainId.GNOSIS_CHAIN]: '0x22625eEDd92c81a219A83e1dc48f88d54786B017',
    [ChainId.SONIC]: '0x815Ab57a5a2E4976cEC0b43C2D50CF26EF6F31Fd',
    [ChainId.ARBITRUM_ONE]: '0xEB1eeaBF0126d813589C3D2CfeFFE410D9aE3863',
    [ChainId.BASE]: '0xb9F8AB3ED3F3aCBa64Bc6cd2DcA74B7F38fD7B88',
    [ChainId.MONAD_TESTNET]: '0xb9F8AB3ED3F3aCBa64Bc6cd2DcA74B7F38fD7B88',
};

// V3
export const STABLE_SURGE_FACTORY: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0x86e67E115f96DF37239E0479441303De0de7bc2b',
    [ChainId.BASE]: '0x4fb47126Fa83A8734991E41B942Ac29A3266C968',
    [ChainId.GNOSIS_CHAIN]: '0x268E2EE1413D768b6e2dc3F5a4ddc9Ae03d9AF42',
    [ChainId.MAINNET]: '0xD53F5d8d926fb2a0f7Be614B16e649B8aC102D83',
    [ChainId.SEPOLIA]: '0xD516c344413B4282dF1E4082EAE6B1081F3b1932',
};

export const GYROECLP_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0x88ED12A90142fDBFe2a28f7d5b48927254C7e760',
    [ChainId.BASE]: '0x5F6848976C2914403B425F18B589A65772F082E3',
    [ChainId.GNOSIS_CHAIN]: '0xEa924b45a3fcDAAdf4E5cFB1665823B8F8F2039B',
    [ChainId.MAINNET]: '0xE9B0a3bc48178D7FE2F5453C8bc1415d73F966d0',
    [ChainId.SEPOLIA]: '0x589cA6855C348d831b394676c25B125BcdC7F8ce',
};

// V3
export const BALANCER_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0x0BF61f706105EA44694f2e92986bD01C39930280',
    [ChainId.MAINNET]: '0x5C6fb490BDFD3246EB0bB062c168DeCAF4bD9FDd',
    [ChainId.GNOSIS_CHAIN]: '0x84813aA3e079A665C0B80F944427eE83cBA63617',
    [ChainId.SONIC]: '0x6077b9801B5627a65A5eeE70697C793751D1a71c',
    [ChainId.ARBITRUM_ONE]: '0x0f08eEf2C785AA5e7539684aF04755dEC1347b7c',
    [ChainId.BASE]: '0x76578ecf9a141296Ec657847fb45B0585bCDa3a6',
    [ChainId.MONAD_TESTNET]: '0x85a80afee867aDf27B50BdB7b76DA70f1E853062',
};

// V3
export const BALANCER_BATCH_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xC85b652685567C1B074e8c0D4389f83a2E458b1C',
    [ChainId.MAINNET]: '0x136f1EFcC3f8f88516B9E94110D56FDBfB1778d1',
    [ChainId.GNOSIS_CHAIN]: '0xe2fa4e1d17725e72dcdAfe943Ecf45dF4B9E285b',
    [ChainId.SONIC]: '0x7761659F9e9834ad367e4d25E0306ba7A4968DAf',
    [ChainId.ARBITRUM_ONE]: '0xaD89051bEd8d96f045E8912aE1672c6C0bF8a85E',
    [ChainId.BASE]: '0x85a80afee867aDf27B50BdB7b76DA70f1E853062',
    [ChainId.MONAD_TESTNET]: '0x956CCab09898C0AF2aCa5e6C229c3aD4E93d9288',
};

// V3
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
    [ChainId.MONAD_TESTNET]: '0x36caC20dd805d128c1a6Dd16eeA845C574b5A17C',
};

// V3
export const BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED: Record<
    number,
    Address
> = {
    [ChainId.SEPOLIA]: '0x6A20a4b6DcFF78e6D21BF0dbFfD58C96644DB9cb',
    [ChainId.ARBITRUM_ONE]: '0xC1A64500E035D9159C8826E982dFb802003227f0',
    [ChainId.BASE]: '0x9dA18982a33FD0c7051B19F0d7C76F2d5E7e017c',
    [ChainId.GNOSIS_CHAIN]: '0x6eaD84Af26E997D27998Fc9f8614e8a19BB93938',
    [ChainId.MAINNET]: '0xb21A277466e7dB6934556a1Ce12eb3F032815c8A',
    [ChainId.SONIC]: '0xE42FFA682A26EF8F25891db4882932711D42e467',
    [ChainId.MONAD_TESTNET]: '0x36caC20dd805d128c1a6Dd16eeA845C574b5A17C',
};

// V3
export const BALANCER_BUFFER_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xb5F3A41515457CC6E2716c62a011D260441CcfC9',
    [ChainId.MAINNET]: '0x9179C06629ef7f17Cb5759F501D89997FE0E7b45',
    [ChainId.GNOSIS_CHAIN]: '0x86e67E115f96DF37239E0479441303De0de7bc2b',
    [ChainId.SONIC]: '0x532dA919D3EB5606b5867A6f505969c57F3A721b',
    [ChainId.ARBITRUM_ONE]: '0x311334883921Fb1b813826E585dF1C2be4358615',
    [ChainId.BASE]: '0x4132f7AcC9dB7A6cF7BE2Dd3A9DC8b30C7E6E6c8',
    [ChainId.MONAD_TESTNET]: '0x9Ac3E70dB606659Bf32D4BdFbb687AD193FD1F5B',
};

// TODO: Figure out Authorizer addresses
export const AUTHORIZER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xa331d84ec860bf466b4cdccfb4ac09a1b43f3ae6',
};

export const ADMIN_OF_AUTHORIZER = '0x171C0fF5943CE5f133130436A29bF61E26516003';
