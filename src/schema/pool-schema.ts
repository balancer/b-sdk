// Typescript typing is more flexible than graphql, some models are more verbose than needed
// to ensure compatability with graphql schema limitations

export type ID = string;
export type Address = string;
export type Integer = number;
export type Decimal = string;

enum BalancerNetwork {
  MAINNET = "1",
  ARBITRUM = "42161",
  POLYGON = "137",
}

export enum BalancerPoolType {
  StablePool = "StablePool",
  MetaStablePool = "MetaStablePool",
  ComposableStablePool = "ComposableStablePool",
  WeightedPool = "WeightedPool",
  LinearPool = "LinearPool",
  LiquidityBootstrappingPool = "LiquidityBootstrappingPool",
}

enum BalancerVaultVersion {
  TWO = "TWO",
}

enum BalancerPoolOwnerType {
  DAO = "DAO",
  ZERO_ADDRESS = "ZERO_ADDRESS",
  EXTERNAL = "EXTERNAL",
}

enum BalancerPoolJoinType {
  PROPORTIONAL = "PROPORTIONAL",
  SINGLE_ASSET = "SINGLE_ASSET",
  ANY_TOKENS = "ANY_TOKENS", // TODO needs a better name
}

enum BalancerPoolExitType {
  PROPORTIONAL = "PROPORTIONAL",
  SINGLE_ASSET = "SINGLE_ASSET",
  ANY_TOKENS = "ANY_TOKENS", // TODO needs a better name
}

enum BalancerPoolTokenType {
  // this type would need to be built in a way that there is no overlaps,
  // ie: a token cannot have more than one type. Could be a better name than "type"
  STABLE_BPT = "STABLE_BPT",
  PHANTOM_BPT = "LINEAR_BPT",
  LINEAR_BPT = "LINEAR_BPT",
  WETH = "WETH",
  STANDARD = "STANDARD", // could be a better name here, a token that is not a nested bpt
}

export interface BalancerBasePool {
  id: ID;
  address: Address;
  chain: BalancerNetwork;
  vault: Address;
  vaultVersion: BalancerVaultVersion;
  poolType: BalancerPoolType; // may be better to use __typename to align with graphql
  poolTypeVersion: number;
  name: string;
  symbol: string;
  decimals: number;
  owner: BalancerPoolOwnerType;
  ownerAddress: Address;
  factory?: Address;
  createTime: number;
  empty: boolean; // BPT balance is 0 or the minimum amount (ie: 0.000000000001)
  initialized: boolean; // Whether an init join has been performed on the pool
  // TODO: can we model to facilitate price impact calculations?
  joinConfig: BalancerPoolJoinConfig;
  exitConfig: BalancerPoolExitConfig;

  totalShares: BigInt;
  holdersCount: BigInt;
  swapsCount: BigInt;
  swapFee: BigInt;
  swapsEnabled: boolean;
  inRecoveryMode: boolean;

  usdData: BalancerPoolDataUSD;
  apr: BalancerPoolApr;

  // tokens
  tokens: BalancerPoolBaseToken[];
}

export interface BalancerWeightedPool extends BalancerBasePool {
  poolType: BalancerPoolType.WeightedPool;
  tokens: (
    | BalancerPoolToken
    | BalancerPoolStableBptToken
    | BalancerPoolLinearBptToken
  )[];
}

export interface BalancerStablePool extends BalancerBasePool {
  poolType: BalancerPoolType.StablePool;
  amp: BigInt;
}

export interface BalancerMetaStablePool extends BalancerBasePool {
  poolType: BalancerPoolType.MetaStablePool;
  amp: BigInt;
}

export interface BalancerComposableStablePool extends BalancerBasePool {
  poolType: BalancerPoolType.ComposableStablePool;
  amp: BigInt;
  tokens: (
    | BalancerPoolToken
    | BalancerPoolStableBptToken
    | BalancerPoolLinearBptToken
  )[];
}

export interface BalancerLiquidityBootstrappingPool extends BalancerBasePool {
  poolType: BalancerPoolType.LiquidityBootstrappingPool;
  tokens: BalancerPoolTokenWithWeight[];
  gradualWeightUpdates: BalancerPoolGradualWeightUpdate[];
}

interface BalancerLinearPool extends BalancerBasePool {
  poolType: BalancerPoolType.LinearPool;
  mainToken: BalancerPoolBaseToken;
  wrappedToken: BalancerPoolBaseToken;
  bpt: BalancerPoolBaseToken;
}

interface BalancerPoolGradualWeightUpdate {
  startTimestamp: Integer;
  endTimestamp: Integer;
  weightChanges: BalancerPoolTokenWeightChange[];
}

interface BalancerPoolTokenWeightChange {
  poolTokenAddress: Address;
  poolTokenIndex: Integer;
  startWeight: BigInt;
  endWeight: BigInt;
}

interface BalancerPoolBaseToken {
  address: String;
  balance: BigInt;
  decimals: Integer;
  name: string;
  symbol: string;
  index: Integer;
  totalBalance: BigInt; // the total balance in the pool, regardless of nesting
  priceRate: BigInt; // we include the priceRate on all tokens. Default to 1.0

  // identifies the token as WETH, nested stable BPT, nested linear BPT or "standard"
  type: BalancerPoolTokenType;
}

interface BalancerPoolToken extends BalancerPoolBaseToken {
  __typename: "BalancerPoolToken";
}

interface BalancerPoolTokenWithWeight extends BalancerPoolBaseToken {
  __typename: "BalancerPoolTokenWithWeight";
  weight: BigInt;
}

interface BalancerPoolStableBptToken extends BalancerPoolBaseToken {
  __typename: "BalancerPoolStableBptToken";
  poolId: ID;
  pool: BalancerComposableStablePoolNested;
}

interface BalancerPoolLinearBptToken extends BalancerPoolBaseToken {
  __typename: "BalancerPoolLinearBptToken";
  poolId: ID;
  pool: BalancerLinearPool;
}

interface BalancerPoolStableBptToken extends BalancerPoolBaseToken {
  __typename: "BalancerPoolStableBptToken";
}

// A stable pool that is nested inside another pool cannot have another stable pool nested
export interface BalancerComposableStablePoolNested extends BalancerBasePool {
  poolType: BalancerPoolType.ComposableStablePool;
  amp: BigInt;
  tokens: (BalancerPoolToken | BalancerPoolLinearBptToken)[];
}

// USD data is data that changes at a high frequency and needs to be refetched often
interface BalancerPoolDataUSD {
  id: ID;
  poolId: ID;

  totalLiquidityUSD: Decimal;
  volume24hUSD: Decimal;
  swapFees24hUSD: Decimal;
  yieldCapture24hUSD: Decimal;

  totalShares24hAgo: BigInt;
  totalLiquidityUSD24hAgo: Decimal;
  volume48hUSD: Decimal;
  swapFees48hUSD: Decimal;
  yieldCapture48hUSD: Decimal;
}

interface BalancerPoolJoinConfig {
  supportedTypes: BalancerPoolJoinType[];

  // configs for each pool token
  poolTokenConfigs: BalancerPoolTokenJoinConfig[];

  // the ui doesn't use proportional joins, it uses EXACT_TOKENS_IN_FOR_BPT_OUT to allow the
  // user to configure any amount for each pool token, this concept could maybe use a better name.
  // Additionally, the ui provides a proportional estimation when applicable.
  //
  // Since it's possible not all tokens are being used for a given join, this path is not always the
  // "most efficient" for a given combination of tokens, but for the sake of limiting the scope, we
  // provide a "generic" path that works for any given combination.
  steps: BalancerPoolJoinStep[];

  // Leaf tokens are tokens that represent the last node in the tree. These are most often the
  // "normal" tokens that users hold in their wallet ie: USDC/USDT/DAI instead of bbausd
  // We consider the main token of a linear pool the leaf token.
  leafTokens: Address[];
}

interface BalancerPoolTokenJoinConfig {
  poolTokenIndex: number;
  poolTokenAddress: Address;
  // To scope this, we support the following options:
  // - Standard token (the pool token is not a nested bpt)
  // - Linear pool main token (the pool token is a nested linear bpt)
  // - Stable BPT (the pool token is a nested stable bpt)
  // - Leaf tokens of a nested stable BPT (the pool token is a nested stable bpt)
  options: BalancerPoolTokenJoinExitConfigOptions[];
}

type BalancerPoolTokenJoinExitConfigOptions =
  | BalancerPoolTokenConfigStandardToken
  | BalancerPoolTokenConfigLinearMainToken
  | BalancerPoolTokenConfigStableBpt
  | BalancerPoolTokenConfigStableBptLeafTokens;

interface BalancerPoolConfigBaseToken {
  address: Address;
}

interface BalancerPoolTokenConfigStandardToken
  extends BalancerPoolConfigBaseToken {
  __typename: "BalancerPoolTokenConfigStandardToken";
}

interface BalancerPoolConfigLinearBpt extends BalancerPoolConfigBaseToken {
  __typename: "BalancerPoolConfigLinearBpt";
  poolId: ID;
}

interface BalancerPoolTokenConfigLinearMainToken
  extends BalancerPoolConfigBaseToken {
  __typename: "BalancerPoolTokenConfigLinearMainToken";
  poolId: ID;
}

interface BalancerPoolConfigLinearWrappedToken
  extends BalancerPoolConfigBaseToken {
  __typename: "BalancerPoolConfigLinearWrappedToken";
  poolId: ID;
}

interface BalancerPoolTokenConfigStableBpt extends BalancerPoolConfigBaseToken {
  __typename: "BalancerPoolConfigStableBpt";
  poolId: ID;
}

interface BalancerPoolTokenConfigStableBptLeafTokens
  extends BalancerPoolConfigBaseToken {
  __typename: "BalancerPoolTokenConfigStableBptLeafTokens";
  poolId: ID;
  // the leaf tokens of this stable bpt
  leafTokens: Address[];
}

export type BalancerPoolJoinStep =
  | BalancerPoolJoinBatchSwapStep
  | BalancerPoolJoinPoolStep;

export type BalancerPoolExitStep =
  | BalancerPoolExitBatchSwapStep
  | BalancerPoolExitPoolStep
  | BalancerPoolExitOptionalUnwrapStep;

export type BalancerPoolSingleAssetExitStep =
  | BalancerPoolSingleAssetExitBatchSwapStep
  | BalancerPoolExitPoolStep;

export interface BalancerPoolJoinBatchSwapStep {
  __typename: "BalancerPoolJoinBatchSwapStep";
  swaps: {
    poolId: ID;
    tokenIn: Address;
    tokenOut: Address;
  }[];
  tokensIn: Address[];
  tokensOut: Address[];
}

export interface BalancerPoolExitBatchSwapStep {
  __typename: "BalancerPoolExitBatchSwapStep";
  swaps: (
    | BalancerPoolExitBatchSwapStepSwap
    | BalancerPoolExitBatchSwapStepLinearPoolSwap
  )[];
  tokensIn: Address[];
  tokensOut: Address[];
}

export interface BalancerPoolExitBatchSwapStepSwap {
  __typename: "BalancerPoolExitBatchSwapStepSwap";
  poolId: ID;
  tokenIn: Address;
  tokenOut: Address;
}

export interface BalancerPoolExitBatchSwapStepLinearPoolSwap {
  __typename: "BalancerPoolExitBatchSwapStepLinearPoolSwap";
  poolId: ID;
  // tokenIn here is the phantom bpt (pool token)
  tokenIn: Address;

  // The tokenOut is determined by the amount of BPT in. If there are enough main tokens in
  // the pool, we swap directly to main tokens. If the BPT in represents more main tokens than
  // are available, we swap to wrapped tokens. There is an edge case where the exit cannot
  // be facilitated by either main or wrapped tokens alone, at which point we need to split across both
  // TODO: should we add additional metadata here or is it safe to assume you can get
  // TODO this data from the pool structure?
  // Possible additional metadata:
  // mainToken
  // wrappedToken
  // mainTokenBalance
  // wrappedTokenBalance
}

// The model itself cannot anticipate whether an individual exit will require an unwrap or not,
// it does not and should not have access to the user's balance. We add the unwrap step here and
// recognize that it is an optional step when we end up with wrapped tokens from a previous step
export interface BalancerPoolExitOptionalUnwrapStep {
  __typename: "BalancerPoolExitOptionalUnwrapStep";
  unwraps: {
    tokenIn: Address;
    // TODO: we provide only the pool id here and expect the implementor to determine what type of unwrap is
    // TODO: needed based on the pool data. This could be amended if there is an alternative desirable path
    poolId: ID;
  }[];
}

// The mint BPT step is a standard join step. At least one mint step will always occur on the pool itself.
// Additionally, a second mint step will be present if there is a nested stable BPT in the pool.
export interface BalancerPoolJoinPoolStep {
  __typename: "BalancerPoolJoinPoolStep";
  poolId: ID;
  tokensIn: Address[];
}

export interface BalancerPoolExitPoolStep {
  __typename: "BalancerPoolExitPoolStep";
  poolId: ID;
  tokensOut: Address[];
}

export interface BalancerPoolSingleAssetExitBatchSwapStep {
  __typename: "BalancerPoolSingleAssetExitBatchSwapStep";
  swaps: {
    poolId: ID;
    tokenIn: Address;
    tokenOut: Address;
  }[];
  tokenIn: Address;
  tokenOut: Address;
}

interface BalancerPoolExitConfig {
  supportedTypes: BalancerPoolExitType[];

  // configs for each pool token
  poolTokenConfigs: BalancerPoolTokenExitConfig[];

  proportionalSteps: BalancerPoolExitStep[];

  // Leaf tokens are tokens that represent the last node in the tree. These are most often the
  // "normal" tokens that users hold in their wallet ie: USDC/USDT/DAI instead of bbausd
  // We consider the main token of a linear pool the leaf token.
  leafTokens: Address[];
}

interface BalancerPoolTokenExitConfig {
  poolTokenIndex: number;
  poolTokenAddress: Address;
  // To scope this, we support the following options:
  // - Standard token (the pool token is not a nested bpt)
  // - Linear pool main token (the pool token is a nested linear bpt)
  // - Stable BPT (the pool token is a nested stable bpt)
  // - Leaf tokens of a nested stable BPT (the pool token is a nested stable bpt)
  options: BalancerPoolTokenJoinExitConfigOptions[];
  // When performing a single asset exit, this is the most optimal path out.
  exitSteps: BalancerPoolSingleAssetExitStep[];
}

interface BalancerPoolApr {
  apr: BalancerPoolAprValue;
  swapApr: Decimal; // we make the assumption swap apr will never have a range
  nativeRewardApr: BalancerPoolAprValue;
  thirdPartyApr: BalancerPoolAprValue;
  items: BalancerPoolAprItem[];
  hasRewardApr: boolean;
}

// All APR values are represented as the union of a range or a total. While range is only supported on BAL emissions
// we model it in such a way to allow for a generic ui implementation.
type BalancerPoolAprValue = BalancerPoolAprRange | BalancerPoolAprTotal;

interface BalancerPoolAprRange {
  __typename: "BalancerPoolAprRange";
  min: Decimal;
  max: Decimal;
}

interface BalancerPoolAprTotal {
  __typename: "BalancerPoolAprTotal";
  total: Decimal;
}

interface BalancerPoolAprItem {
  id: ID;
  title: string;
  apr: BalancerPoolAprValue;
  subItems: BalancerPoolAprSubItem[];
}

interface BalancerPoolAprSubItem {
  id: ID;
  title: string;
  apr: BalancerPoolAprValue;
}
