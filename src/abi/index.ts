import { balancerCompositeLiquidityRouterNestedAbi } from './balancerCompositeLiquidityRouterNested';
import { balancerQueriesAbi } from './balancerQueries';
import { balancerRelayerAbi } from './balancerRelayer';
import { composableStableFactoryV6Abi_V2 } from './composableStableFactoryV6.V2';
import { permit2Abi } from './permit2';
import { vaultAbi_V2 } from './v2';
import { weightedPoolFactoryV4Abi_V2 } from './weightedPoolFactoryV4.V2';
import {
    vaultAbi_V3,
    vaultExtensionAbi_V3,
    routerAbi_V3,
    batchRouterAbi_V3,
    compositeLiquidityRouterAbi_V3,
    bufferRouterAbi_V3,
    weightedPoolFactoryAbi_V3,
    stablePoolFactoryAbi_V3,
    gyroECLPPoolFactoryAbi_V3,
    stableSurgePoolFactoryAbi_V3,
    reClammPoolFactoryAbi_V3,
    lBPoolFactoryAbi_V3,
    weightedPoolAbi_V3,
    stablePoolAbi_V3,
    liquidityBootstrappingPoolAbi_V3,
    gyro2CLPAbi_V3,
    gyroECLPAbi_V3,
    lBPMigrationRouterAbi_V3,
    unbalancedAddViaSwapRouterAbi_V3,
} from './v3';

export * from './authorizer';
export * from './batchRelayerLibrary';
export * from './permit2';
export * from './vault.V2';
export * from './v2';
export * from './v3';
export * from './weightedPoolV4.V2';

// V3 Common ABIs

export const commonABIsV3 = [
    ...vaultAbi_V3,
    ...vaultExtensionAbi_V3,
    ...permit2Abi,
];

export const poolABIsV3 = [
    ...weightedPoolAbi_V3,
    ...stablePoolAbi_V3,
    ...liquidityBootstrappingPoolAbi_V3,
    ...gyro2CLPAbi_V3,
    ...gyroECLPAbi_V3,
];

// V3 Routers ABIs Extended

export const balancerRouterAbiExtended = [
    ...routerAbi_V3,
    ...commonABIsV3,
    ...poolABIsV3,
];

export const balancerCompositeLiquidityRouterBoostedAbiExtended = [
    ...compositeLiquidityRouterAbi_V3,
    ...commonABIsV3,
    ...poolABIsV3,
];

export const balancerCompositeLiquidityRouterNestedAbiExtended = [
    ...balancerCompositeLiquidityRouterNestedAbi,
    ...commonABIsV3,
    ...poolABIsV3,
];

export const balancerBufferRouterAbiExtended = [
    ...bufferRouterAbi_V3,
    ...commonABIsV3,
    ...poolABIsV3,
];

export const balancerBatchRouterAbiExtended = [
    ...batchRouterAbi_V3,
    ...commonABIsV3,
    ...poolABIsV3,
];

export const balancerMigrationRouterAbiExtended = [
    ...lBPMigrationRouterAbi_V3,
    ...commonABIsV3,
    ...poolABIsV3,
];

export const balancerUnbalancedAddViaSwapRouterAbiExtended = [
    ...unbalancedAddViaSwapRouterAbi_V3,
    ...commonABIsV3,
    ...poolABIsV3,
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
    ...stableSurgePoolFactoryAbi_V3,
    ...commonABIsV3,
];

export const gyroECLPPoolFactoryAbiExtended = [
    ...gyroECLPPoolFactoryAbi_V3,
    ...commonABIsV3,
];

export const reClammPoolFactoryAbiExtended = [
    ...reClammPoolFactoryAbi_V3,
    ...commonABIsV3,
];

export const lBPoolFactoryAbi_V3Extended = [
    ...lBPoolFactoryAbi_V3,
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
