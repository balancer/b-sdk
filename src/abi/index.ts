import { balancerBatchRouterAbi } from './balancerBatchRouter';
import { balancerBufferRouterAbi } from './balancerBufferRouter';
import { balancerCompositeLiquidityRouterBoostedAbi } from './balancerCompositeLiquidityRouterBoosted';
import { balancerCompositeLiquidityRouterNestedAbi } from './balancerCompositeLiquidityRouterNested';
import { balancerQueriesAbi } from './balancerQueries';
import { balancerRelayerAbi } from './balancerRelayer';
import { balancerRouterAbi } from './balancerRouter';
import { composableStableFactoryV6Abi_V2 } from './composableStableFactoryV6.V2';
import { stablePoolFactoryAbi_V3 } from './stablePoolFactory.V3';
import { stableSurgeFactoryAbi } from './stableSurgeFactory';
import { permit2Abi } from './permit2';
import { vaultAbi as vaultV2Abi } from './v2';
import {
    vaultAbi as vaultV3Abi,
    weightedPoolFactoryAbi as weightedPoolFactoryAbi_V3,
    gyroECLPPoolFactoryAbi as gyroECLPPoolFactoryAbi_V3,
} from './v3';
import { vaultExtensionAbi_V3 } from './vaultExtension.V3';
import { weightedPoolFactoryV4Abi_V2 } from './weightedPoolFactoryV4.V2';

export * from './authorizer';
export * from './batchRelayerLibrary';
export * from './permit2';
export * from './vault.V2';
export * from './v3';
export * from './vaultExtension.V3';
export * from './weightedPoolV4.V2';
export * from './weightedPool.V3';

// V3 Common ABIs

export const commonABIsV3 = [
    ...vaultV3Abi,
    ...vaultExtensionAbi_V3,
    ...permit2Abi,
];

// V3 Routers ABIs Extended

export const balancerRouterAbiExtended = [
    ...balancerRouterAbi,
    ...commonABIsV3,
];

export const balancerCompositeLiquidityRouterBoostedAbiExtended = [
    ...balancerCompositeLiquidityRouterBoostedAbi,
    ...commonABIsV3,
];

export const balancerCompositeLiquidityRouterNestedAbiExtended = [
    ...balancerCompositeLiquidityRouterNestedAbi,
    ...commonABIsV3,
];

export const balancerBufferRouterAbiExtended = [
    ...balancerBufferRouterAbi,
    ...commonABIsV3,
];

export const balancerBatchRouterAbiExtended = [
    ...balancerBatchRouterAbi,
    ...commonABIsV3,
];

// V3 Pool Factories ABIs Extended

export const weightedPoolFactoryAbiExtended_V3 = [
    ...weightedPoolFactoryAbi_V3,
    ...commonABIsV3,
];

export const stablePoolFactoryAbiExtended = [
    ...stablePoolFactoryAbi_V3,
    ...commonABIsV3,
];

export const stableSurgeFactoryAbiExtended = [
    ...stableSurgeFactoryAbi,
    ...commonABIsV3,
];

export const gyroECLPPoolFactoryAbiExtended = [
    ...gyroECLPPoolFactoryAbi_V3,
    ...commonABIsV3,
];

// V2 Common ABIs

export const commonABIsV2 = [...vaultV2Abi];

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
