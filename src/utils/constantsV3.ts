import { Address } from 'viem';
import { ChainId } from './constants';

// V3
export const STABLE_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xd67F485C07D258B3e93835a3799d862ffcB55923',
    [ChainId.MAINNET]: '0xB9d01CA61b9C181dA1051bFDd28e1097e920AB14',
    [ChainId.GNOSIS_CHAIN]: '0x22625eEDd92c81a219A83e1dc48f88d54786B017',
    [ChainId.SONIC]: '0x815Ab57a5a2E4976cEC0b43C2D50CF26EF6F31Fd',
    [ChainId.ARBITRUM_ONE]: '0xEB1eeaBF0126d813589C3D2CfeFFE410D9aE3863',
    [ChainId.BASE]: '0xb9F8AB3ED3F3aCBa64Bc6cd2DcA74B7F38fD7B88',
    [ChainId.MONAD_TESTNET]: '0xb9F8AB3ED3F3aCBa64Bc6cd2DcA74B7F38fD7B88',
    [ChainId.AVALANCHE]: '0x1702067424096F07A60e62cceE3dE9420068492D',
};

// V3
export const STABLE_SURGE_FACTORY: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: '0x86e67E115f96DF37239E0479441303De0de7bc2b',
    [ChainId.BASE]: '0x4fb47126Fa83A8734991E41B942Ac29A3266C968',
    [ChainId.GNOSIS_CHAIN]: '0x268E2EE1413D768b6e2dc3F5a4ddc9Ae03d9AF42',
    [ChainId.MAINNET]: '0xD53F5d8d926fb2a0f7Be614B16e649B8aC102D83',
    [ChainId.SEPOLIA]: '0xD516c344413B4282dF1E4082EAE6B1081F3b1932',
    // TODO once deployed [ChainId.AVALANCHE]: '0x0..',
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
    [ChainId.AVALANCHE]: '0x4bdCc2fb18AEb9e2d281b0278D946445070EAda7',
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
    [ChainId.AVALANCHE]: '0xa523f47A933D5020b23629dDf689695AA94612Dc',
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
    // [ChainId.AVALANCHE]: TODO once eployed,
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
    [ChainId.AVALANCHE]: '0x96484f2aBF5e58b15176dbF1A799627B53F13B6d',
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
    [ChainId.AVALANCHE]: '0x6817149cb753BF529565B4D023d7507eD2ff4Bc0',
};

// TODO: Figure out Authorizer addresses
export const AUTHORIZER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xa331d84ec860bf466b4cdccfb4ac09a1b43f3ae6',
};

export const ADMIN_OF_AUTHORIZER = '0x171C0fF5943CE5f133130436A29bF61E26516003';
