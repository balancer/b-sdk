import { Address } from 'viem';
import { ChainId } from './constants';
import { balancerContracts } from './balancerContracts';

const {
    Vault,
    VaultAdmin,
    WeightedPoolFactory,
    StablePoolFactory,
    StableSurgePoolFactory,
    GyroECLPPoolFactory,
    Router,
    BatchRouter,
    CompositeLiquidityRouter,
    BufferRouter,
} = balancerContracts.v3;

// V3
export const VAULT_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: Vault[ChainId.SEPOLIA],
    [ChainId.MAINNET]: Vault[ChainId.MAINNET],
    [ChainId.GNOSIS_CHAIN]: Vault[ChainId.GNOSIS_CHAIN],
    [ChainId.SONIC]: Vault[ChainId.SONIC],
    [ChainId.ARBITRUM_ONE]: Vault[ChainId.ARBITRUM_ONE],
    [ChainId.BASE]: Vault[ChainId.BASE],
    [ChainId.MONAD_TESTNET]: '0xd07101ebD191C366D5A177cA67826014B0E42Ae3',
    [ChainId.AVALANCHE]: Vault[ChainId.AVALANCHE],
};

// V3
export const VAULT_ADMIN: Record<number, Address> = {
    [ChainId.SEPOLIA]: VaultAdmin[ChainId.SEPOLIA],
    [ChainId.MAINNET]: VaultAdmin[ChainId.MAINNET],
    [ChainId.GNOSIS_CHAIN]: VaultAdmin[ChainId.GNOSIS_CHAIN],
    [ChainId.SONIC]: VaultAdmin[ChainId.SONIC],
    [ChainId.ARBITRUM_ONE]: VaultAdmin[ChainId.ARBITRUM_ONE],
    [ChainId.BASE]: VaultAdmin[ChainId.BASE],
    [ChainId.MONAD_TESTNET]: '0x9F1f11a414AF861bef8108B3cE2Cbc43DEBB3165',
    [ChainId.AVALANCHE]: VaultAdmin[ChainId.AVALANCHE],
};

// V3
export const WEIGHTED_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: WeightedPoolFactory[ChainId.SEPOLIA],
    [ChainId.MAINNET]: WeightedPoolFactory[ChainId.MAINNET],
    [ChainId.GNOSIS_CHAIN]: WeightedPoolFactory[ChainId.GNOSIS_CHAIN],
    [ChainId.SONIC]: WeightedPoolFactory[ChainId.SONIC],
    [ChainId.ARBITRUM_ONE]: WeightedPoolFactory[ChainId.ARBITRUM_ONE],
    [ChainId.BASE]: WeightedPoolFactory[ChainId.BASE],
    [ChainId.MONAD_TESTNET]: '0xf23b4DB826DbA14c0e857029dfF076b1c0264843',
    [ChainId.AVALANCHE]: WeightedPoolFactory[ChainId.AVALANCHE],
};

// V3
export const STABLE_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.SEPOLIA]: StablePoolFactory[ChainId.SEPOLIA],
    [ChainId.MAINNET]: StablePoolFactory[ChainId.MAINNET],
    [ChainId.GNOSIS_CHAIN]: StablePoolFactory[ChainId.GNOSIS_CHAIN],
    [ChainId.SONIC]: StablePoolFactory[ChainId.SONIC],
    [ChainId.ARBITRUM_ONE]: StablePoolFactory[ChainId.ARBITRUM_ONE],
    [ChainId.BASE]: StablePoolFactory[ChainId.BASE],
    [ChainId.MONAD_TESTNET]: '0xb9F8AB3ED3F3aCBa64Bc6cd2DcA74B7F38fD7B88',
    [ChainId.AVALANCHE]: StablePoolFactory[ChainId.AVALANCHE],
};

// V3
export const STABLE_SURGE_FACTORY: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: StableSurgePoolFactory[ChainId.ARBITRUM_ONE],
    [ChainId.BASE]: StableSurgePoolFactory[ChainId.BASE],
    [ChainId.GNOSIS_CHAIN]: StableSurgePoolFactory[ChainId.GNOSIS_CHAIN],
    [ChainId.MAINNET]: StableSurgePoolFactory[ChainId.MAINNET],
    [ChainId.SEPOLIA]: StableSurgePoolFactory[ChainId.SEPOLIA],
    // TODO once deployed [ChainId.AVALANCHE]: '0x0..',
};

export const GYROECLP_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    [ChainId.ARBITRUM_ONE]: GyroECLPPoolFactory[ChainId.ARBITRUM_ONE],
    [ChainId.BASE]: GyroECLPPoolFactory[ChainId.BASE],
    [ChainId.GNOSIS_CHAIN]: GyroECLPPoolFactory[ChainId.GNOSIS_CHAIN],
    [ChainId.MAINNET]: GyroECLPPoolFactory[ChainId.MAINNET],
    [ChainId.SEPOLIA]: GyroECLPPoolFactory[ChainId.SEPOLIA],
    [ChainId.AVALANCHE]: GyroECLPPoolFactory[ChainId.AVALANCHE],
};

// V3
export const BALANCER_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: Router[ChainId.SEPOLIA],
    [ChainId.MAINNET]: Router[ChainId.MAINNET],
    [ChainId.GNOSIS_CHAIN]: Router[ChainId.GNOSIS_CHAIN],
    [ChainId.SONIC]: Router[ChainId.SONIC],
    [ChainId.ARBITRUM_ONE]: Router[ChainId.ARBITRUM_ONE],
    [ChainId.BASE]: Router[ChainId.BASE],
    [ChainId.MONAD_TESTNET]: '0x85a80afee867aDf27B50BdB7b76DA70f1E853062',
    [ChainId.AVALANCHE]: Router[ChainId.AVALANCHE],
};

// V3
export const BALANCER_BATCH_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: BatchRouter[ChainId.SEPOLIA],
    [ChainId.MAINNET]: BatchRouter[ChainId.MAINNET],
    [ChainId.GNOSIS_CHAIN]: BatchRouter[ChainId.GNOSIS_CHAIN],
    [ChainId.SONIC]: BatchRouter[ChainId.SONIC],
    [ChainId.ARBITRUM_ONE]: BatchRouter[ChainId.ARBITRUM_ONE],
    [ChainId.BASE]: BatchRouter[ChainId.BASE],
    [ChainId.MONAD_TESTNET]: '0x956CCab09898C0AF2aCa5e6C229c3aD4E93d9288',
    [ChainId.AVALANCHE]: BatchRouter[ChainId.AVALANCHE],
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
    [ChainId.SEPOLIA]: CompositeLiquidityRouter[ChainId.SEPOLIA],
    [ChainId.ARBITRUM_ONE]: CompositeLiquidityRouter[ChainId.ARBITRUM_ONE],
    [ChainId.BASE]: CompositeLiquidityRouter[ChainId.BASE],
    [ChainId.GNOSIS_CHAIN]: CompositeLiquidityRouter[ChainId.GNOSIS_CHAIN],
    [ChainId.MAINNET]: CompositeLiquidityRouter[ChainId.MAINNET],
    [ChainId.SONIC]: CompositeLiquidityRouter[ChainId.SONIC],
    [ChainId.MONAD_TESTNET]: '0x36caC20dd805d128c1a6Dd16eeA845C574b5A17C',
    [ChainId.AVALANCHE]: CompositeLiquidityRouter[ChainId.AVALANCHE],
};

// V3
export const BALANCER_BUFFER_ROUTER: Record<number, Address> = {
    [ChainId.SEPOLIA]: BufferRouter[ChainId.SEPOLIA],
    [ChainId.MAINNET]: BufferRouter[ChainId.MAINNET],
    [ChainId.GNOSIS_CHAIN]: BufferRouter[ChainId.GNOSIS_CHAIN],
    [ChainId.SONIC]: BufferRouter[ChainId.SONIC],
    [ChainId.ARBITRUM_ONE]: BufferRouter[ChainId.ARBITRUM_ONE],
    [ChainId.BASE]: BufferRouter[ChainId.BASE],
    [ChainId.MONAD_TESTNET]: '0x9Ac3E70dB606659Bf32D4BdFbb687AD193FD1F5B',
    [ChainId.AVALANCHE]: BufferRouter[ChainId.AVALANCHE],
};

// TODO: Figure out Authorizer addresses
export const AUTHORIZER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xa331d84ec860bf466b4cdccfb4ac09a1b43f3ae6',
};

export const ADMIN_OF_AUTHORIZER = '0x171C0fF5943CE5f133130436A29bF61E26516003';
