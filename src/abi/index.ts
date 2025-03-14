import { permit2Abi } from './permit2';
import { vaultExtensionAbi_V3 } from './vaultExtension.V3';
import { vaultV3Abi } from './vault.V3';
import { balancerRouterAbi } from './balancerRouter';
import { balancerCompositeLiquidityRouterBoostedAbi } from './balancerCompositeLiquidityRouterBoosted';
import { balancerCompositeLiquidityRouterNestedAbi } from './balancerCompositeLiquidityRouterNested';
import { balancerBufferRouterAbi } from './balancerBufferRouter';
import { balancerBatchRouterAbi } from './balancerBatchRouter';

export * from './authorizer';
export * from './balancerQueries';
export * from './balancerRelayer';
export * from './batchRelayerLibrary';
export * from './composableStableFactoryV6.V2';
export * from './erc20';
export * from './permit2';
export * from './vault.V2';
export * from './vault.V3';
export * from './vaultExtension.V3';
export * from './weightedPoolFactory.V3';
export * from './weightedPoolFactoryV4.V2';
export * from './weightedPoolV4.V2';
export * from './weightedPool.V3';
export * from './vaultAdmin.V3';
export * from './stablePoolFactory.V3';
export * from './stableSurgeFactory';
export * from './gyroECLPPoolFactory.V3';

export const commonABIsV3 = [
    ...vaultV3Abi,
    ...vaultExtensionAbi_V3,
    ...permit2Abi,
];

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
