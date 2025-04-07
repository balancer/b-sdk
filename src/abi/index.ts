import { balancerCompositeLiquidityRouterNestedAbi } from './balancerCompositeLiquidityRouterNested';
import { balancerQueriesAbi } from './balancerQueries';
import { balancerRelayerAbi } from './balancerRelayer';
import { balancerRouterAbi } from './balancerRouter';
import { composableStableFactoryV6Abi_V2 } from './composableStableFactoryV6.V2';
import { stableSurgeFactoryAbi } from './stableSurgeFactory';
import { permit2Abi } from './permit2';
import { vaultAbi as vaultAbi_V2 } from './v2';
import { weightedPoolFactoryV4Abi_V2 } from './weightedPoolFactoryV4.V2';
import {
    vaultAbi as vaultAbi_V3,
    vaultExtensionAbi,
    batchRouterAbi,
    compositeLiquidityRouterAbi,
    bufferRouterAbi,
    weightedPoolFactoryAbi as weightedPoolFactoryAbi_V3,
    stablePoolFactoryAbi,
    gyroECLPPoolFactoryAbi,
} from './v3';

export * from './authorizer';
export * from './batchRelayerLibrary';
export * from './permit2';
export * from './vault.V2';
export * from './v3';
export * from './weightedPoolV4.V2';

// V3 Common ABIs

export const commonABIsV3 = [
    ...vaultAbi_V3,
    ...vaultExtensionAbi,
    ...permit2Abi,
];

// V3 Routers ABIs Extended

export const balancerRouterAbiExtended = [
    ...balancerRouterAbi,
    ...commonABIsV3,
];

export const balancerCompositeLiquidityRouterBoostedAbiExtended = [
    ...compositeLiquidityRouterAbi,
    ...commonABIsV3,
];

export const balancerCompositeLiquidityRouterNestedAbiExtended = [
    ...balancerCompositeLiquidityRouterNestedAbi,
    ...commonABIsV3,
];

export const balancerBufferRouterAbiExtended = [
    ...bufferRouterAbi,
    ...commonABIsV3,
];

export const balancerBatchRouterAbiExtended = [
    ...batchRouterAbi,
    ...commonABIsV3,
];

// V3 Pool Factories ABIs Extended

export const weightedPoolFactoryAbiExtended_V3 = [
    ...weightedPoolFactoryAbi_V3,
    ...commonABIsV3,
];

export const stablePoolFactoryAbiExtended = [
    ...stablePoolFactoryAbi,
    ...commonABIsV3,
];

export const stableSurgeFactoryAbiExtended = [
    ...stableSurgeFactoryAbi,
    ...commonABIsV3,
];

export const gyroECLPPoolFactoryAbiExtended = [
    ...gyroECLPPoolFactoryAbi,
    ...commonABIsV3,
];

// V2 Common ABIs

export const commonABIsV2 = [...vaultAbi_V2];

// V2 Relayers ABIs Extended

export const balancerQueriesAbiExtended = [
    ...balancerQueriesAbi,
    ...commonABIsV2,
];

export const balancerRelayerAbiExtended = [
    ...balancerRelayerAbi,
    ...commonABIsV2,
];

// V2 Pool Factories ABIs Extended

export const composableStableFactoryAbiExtended = [
    ...composableStableFactoryV6Abi_V2,
    ...commonABIsV2,
];

export const weightedPoolFactoryAbiExtended_V2 = [
    ...weightedPoolFactoryV4Abi_V2,
    ...commonABIsV2,
];
