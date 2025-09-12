// ============================================================================
// GENERATED TYPES - Re-exported from GraphQL Codegen
// ============================================================================
//
// All API response types are now generated from the GraphQL schema using
// graphql-codegen. This ensures compile-time validation of both queries and
// response types, preventing runtime errors from schema changes.
//
// The generated types are located in ../generated/types.ts and are automatically
// updated when the schema changes (via the fetch-schema script).

export * from '../generated/types';

// ============================================================================
// LEGACY TYPE ALIASES - For backward compatibility
// ============================================================================
//
// These aliases maintain backward compatibility with existing code that might
// still reference the old manual type definitions. They map to the generated
// types from GraphQL Codegen.

import type { 
    poolGetPoolQuery,
    poolGetPoolWithBalancesQuery,
    poolGetPoolWithUnderlyingsQuery,
    sorGetSwapPathsQuery,
    sorGetSwapPathsQueryVariables,
    tokenGetTokensQuery,
    poolGetNestedPoolQuery
} from '../generated/types';

// Pool State Types
export type ApiTokenBase = NonNullable<NonNullable<poolGetPoolQuery['poolGetPool']>['poolTokens'][0]>;
export type ApiPoolBase = NonNullable<poolGetPoolQuery['poolGetPool']>;
export type ApiPoolResponse = poolGetPoolQuery['poolGetPool'];
export type ApiPoolWithBalancesResponse = poolGetPoolWithBalancesQuery['poolGetPool'];
export type ApiPoolWithUnderlyingsResponse = poolGetPoolWithUnderlyingsQuery['poolGetPool'];

// SOR Types
export type ApiSorInput = sorGetSwapPathsQueryVariables;
export type ApiSorSwapPathsResponse = sorGetSwapPathsQuery['sorGetSwapPaths'];

// Buffer State Types
export type ApiBufferStateResponse = NonNullable<tokenGetTokensQuery['tokenGetTokens']>[0];

// Nested Pool Types
export type ApiNestedPoolResponse = poolGetNestedPoolQuery['poolGetPool'];
export type ApiNestedPoolToken = NonNullable<NonNullable<poolGetNestedPoolQuery['poolGetPool']>['poolTokens'][0]>;

// ============================================================================
// DEPRECATED TYPES - Use generated types instead
// ============================================================================

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlPoolTokenBase = ApiTokenBase;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlUnderlyingToken = NonNullable<ApiNestedPoolToken['underlyingToken']>;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlPoolBase = ApiPoolBase;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlPoolToken = ApiTokenBase;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlPoolTokenWithBalance = NonNullable<NonNullable<ApiPoolWithBalancesResponse>['poolTokens'][0]>;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlPoolTokenWithUnderlying = NonNullable<NonNullable<ApiPoolWithUnderlyingsResponse>['poolTokens'][0]>;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlPoolResponse = ApiPoolResponse;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlPoolWithBalancesResponse = ApiPoolWithBalancesResponse;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlPoolWithUnderlyingsResponse = ApiPoolWithUnderlyingsResponse;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlSorPathToken = NonNullable<NonNullable<ApiSorSwapPathsResponse>['paths'][0]>['tokens'][0];

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlSorPath = NonNullable<ApiSorSwapPathsResponse>['paths'][0];

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlSorSwapPathsResponse = ApiSorSwapPathsResponse;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlSorInput = ApiSorInput;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlBufferStateResponse = ApiBufferStateResponse;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlNestedPoolToken = ApiNestedPoolToken;

/** @deprecated Use generated types from '../generated/types' instead */
export type GqlNestedPoolResponse = ApiNestedPoolResponse;