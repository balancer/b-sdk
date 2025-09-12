import { Address } from 'viem';
import { Hex } from '@/types';
import { HumanAmount } from '@/data';
import { ChainId } from '@/utils';
import { SwapKind } from '@/types';
import { TokenAmount } from '@/entities';

// ============================================================================
// BASE TYPES - Shared across all API responses
// ============================================================================
//
// NOTE: These types represent only a subset of the full GraphQL schema types
// available in the Balancer API. They are defined based on the specific fields
// queried in the BalancerApiClient modules. The full GraphQL schema contains
// many additional fields (e.g., GqlPoolTokenBase includes balance, id, name,
// priceRate, symbol, totalBalance, weight, etc.) that are not included here
// because they are not used in our current query implementations.
//
// For example, ApiTokenBase only includes { index, address, decimals } while
// the full GqlPoolTokenBase interface in the schema has 11+ fields including
// balance, name, symbol, priceRate, weight, and others.

export type ApiTokenBase = {
    index: number;
    address: Address;
    decimals: number;
};

export type ApiUnderlyingToken = {
    address: Address;
    decimals: number;
};

export type ApiPoolBase = {
    id: Hex;
    address: Address;
    type: string;
    protocolVersion: 1 | 2 | 3;
};

// ============================================================================
// POOL TOKEN TYPES - Different variations of tokens in API responses
// ============================================================================

export type ApiPoolToken = ApiTokenBase;

export type ApiPoolTokenWithBalance = ApiTokenBase & {
    balance: HumanAmount;
};

export type ApiPoolTokenWithUnderlying = ApiTokenBase & {
    underlyingToken: ApiUnderlyingToken | null;
    nestedPool: {
        id: Hex;
        address: Address;
        type: string;
        tokens: ApiPoolTokenWithUnderlying[];
    } | null;
};

// ============================================================================
// POOL RESPONSE TYPES - Complete pool data from API
// ============================================================================

export type ApiPoolResponse = ApiPoolBase & {
    poolTokens: ApiPoolToken[];
};

export type ApiPoolWithBalancesResponse = ApiPoolBase & {
    poolTokens: ApiPoolTokenWithBalance[];
    dynamicData: { totalShares: HumanAmount };
};

export type ApiPoolWithUnderlyingsResponse = ApiPoolBase & {
    poolTokens: ApiPoolTokenWithUnderlying[];
};

// ============================================================================
// SOR (Smart Order Router) TYPES - For swap path queries
// ============================================================================

export type ApiSorPathToken = {
    address: Address;
    decimals: number;
};

export type ApiSorPath = {
    inputAmountRaw: string;
    outputAmountRaw: string;
    pools: string[];
    isBuffer: boolean;
    protocolVersion: number;
    tokens: ApiSorPathToken[];
};

export type ApiSorSwapPathsResponse = {
    tokenInAmount: string;
    tokenOutAmount: string;
    returnAmount: string;
    priceImpact: { error?: string | null; priceImpact?: string | null } | null;
    swapAmount: string;
    paths: ApiSorPath[];
};

export type ApiSorInput = {
    chainId: ChainId;
    tokenIn: Address;
    tokenOut: Address;
    swapKind: SwapKind;
    swapAmount: TokenAmount; // API expects input in human readable form
    useProtocolVersion?: 2 | 3; // If not specified API will return best
    poolIds?: Address[]; // If specified, API will return only paths that contain these poolIds
    considerPoolsWithHooks?: boolean; // If true, API will return paths that contain pools with hooks
};

// ============================================================================
// BUFFER STATE TYPES - For ERC4626 token buffer queries
// ============================================================================

export type ApiBufferStateResponse = {
    wrappedToken: {
        address: Address;
        decimals: number;
    };
    underlyingToken: {
        address: Address;
        decimals: number;
    };
};

// ============================================================================
// NESTED POOL TYPES - For complex nested pool structures
// ============================================================================

export type ApiNestedPoolToken = ApiTokenBase & {
    underlyingToken: ApiUnderlyingToken | null;
    nestedPool: {
        id: Hex;
        address: Address;
        type: string;
        tokens: ApiNestedPoolToken[];
    } | null;
};

export type ApiNestedPoolResponse = ApiPoolBase & {
    poolTokens: ApiNestedPoolToken[];
};

// ============================================================================
// LEGACY TYPE ALIASES - For backward compatibility
// ============================================================================

/** @deprecated Use ApiTokenBase instead */
export type GqlPoolTokenBase = ApiTokenBase;

/** @deprecated Use ApiPoolTokenWithBalance instead */
export type GqlPoolTokenWithBalance = ApiPoolTokenWithBalance;

/** @deprecated Use ApiUnderlyingToken instead */
export type GqlUnderlyingToken = ApiUnderlyingToken;

/** @deprecated Use ApiPoolTokenWithUnderlying instead */
export type GqlPoolTokenWithUnderlying = ApiPoolTokenWithUnderlying;

/** @deprecated Use ApiPoolBase instead */
export type GqlPoolBase = ApiPoolBase;

/** @deprecated Use ApiPoolResponse instead */
export type GqlPoolGetPool = ApiPoolResponse;

/** @deprecated Use ApiPoolWithBalancesResponse instead */
export type GqlPoolGetPoolWithBalances = ApiPoolWithBalancesResponse;

/** @deprecated Use ApiPoolWithUnderlyingsResponse instead */
export type GqlPoolGetPoolWithUnderlyings = ApiPoolWithUnderlyingsResponse;

/** @deprecated Use ApiSorPathToken instead */
export type GqlSorPathToken = ApiSorPathToken;

/** @deprecated Use ApiSorPath instead */
export type GqlSorPath = ApiSorPath;

/** @deprecated Use ApiSorSwapPathsResponse instead */
export type GqlSorGetSwapPaths = ApiSorSwapPathsResponse;


