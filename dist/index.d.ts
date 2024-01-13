import { Hex as Hex$1, Address as Address$1, Chain } from 'viem';

type HumanAmount = `${number}`;
type SupportedRawPoolTypes = LinearPoolType | 'Weighted' | 'Investment' | 'LiquidityBootstrapping' | 'Stable' | 'MetaStable' | 'ComposableStable' | 'StablePhantom' | 'FX' | 'Gyro2' | 'Gyro3' | 'GyroE';
type LinearPoolType = `${string}Linear`;
type RawPool = RawBasePool | RawLinearPool | RawWeightedPool | RawStablePool | RawComposableStablePool | RawMetaStablePool | RawGyro2Pool | RawGyro3Pool | RawGyroEPool;
interface RawBasePool {
    id: Hex$1;
    address: Address$1;
    name: string;
    poolType: SupportedRawPoolTypes | string;
    poolTypeVersion: number;
    swapFee: HumanAmount;
    swapEnabled: boolean;
    isPaused: boolean;
    inRecoveryMode: boolean;
    tokens: RawPoolToken[];
    tokensList: Address$1[];
    liquidity: HumanAmount;
    totalShares: HumanAmount;
}
interface RawLinearPool extends RawBasePool {
    poolType: LinearPoolType;
    mainIndex: number;
    wrappedIndex: number;
    lowerTarget: HumanAmount;
    upperTarget: HumanAmount;
    tokens: RawPoolTokenWithRate[];
}
interface RawBaseStablePool extends RawBasePool {
    amp: string;
}
interface RawStablePool extends RawBaseStablePool {
    poolType: 'Stable';
}
interface RawComposableStablePool extends RawBaseStablePool {
    poolType: 'ComposableStable' | 'StablePhantom';
    tokens: RawPoolTokenWithRate[];
}
interface RawMetaStablePool extends RawBaseStablePool {
    poolType: 'MetaStable';
    tokens: RawPoolTokenWithRate[];
}
interface RawWeightedPool extends RawBasePool {
    poolType: 'Weighted' | 'Investment' | 'LiquidityBootstrapping';
    tokens: RawWeightedPoolToken[];
    hasActiveWeightUpdate?: boolean;
}
interface RawGyro2Pool extends RawBasePool {
    poolType: 'Gyro2';
    sqrtAlpha: HumanAmount;
    sqrtBeta: HumanAmount;
}
interface RawGyro3Pool extends RawBasePool {
    poolType: 'Gyro3';
    root3Alpha: HumanAmount;
}
interface RawGyroEPool extends RawBasePool {
    poolType: 'GyroE';
    alpha: HumanAmount;
    beta: HumanAmount;
    c: HumanAmount;
    s: HumanAmount;
    lambda: HumanAmount;
    tauAlphaX: HumanAmount;
    tauAlphaY: HumanAmount;
    tauBetaX: HumanAmount;
    tauBetaY: HumanAmount;
    u: HumanAmount;
    v: HumanAmount;
    w: HumanAmount;
    z: HumanAmount;
    dSq: HumanAmount;
    tokenRates?: HumanAmount[];
}
interface RawFxPool extends RawBasePool {
    poolType: 'FX';
    tokens: RawFxPoolToken[];
    alpha: HumanAmount;
    beta: HumanAmount;
    lambda: HumanAmount;
    delta: HumanAmount;
    epsilon: HumanAmount;
}
interface MinimalToken {
    address: Address$1;
    decimals: number;
    index: number;
}
interface RawPoolToken extends MinimalToken {
    symbol: string;
    name: string;
    balance: HumanAmount;
}
interface RawWeightedPoolToken extends RawPoolToken {
    weight: HumanAmount;
}
interface RawPoolTokenWithRate extends RawPoolToken {
    priceRate: HumanAmount;
}
interface RawFxPoolToken extends RawPoolToken {
    token: {
        latestFXPrice: HumanAmount;
        fxOracleDecimals?: number;
    };
}
interface GetPoolsResponse {
    pools: RawPool[];
    syncedToBlockNumber?: bigint;
    poolsWithActiveAmpUpdates?: string[];
    poolsWithActiveWeightUpdates?: string[];
}
interface ProviderSwapOptions {
    block?: bigint;
    timestamp: bigint;
}
interface PoolDataProvider {
    getPools(options: ProviderSwapOptions): Promise<GetPoolsResponse>;
}
interface PoolDataEnricher {
    fetchAdditionalPoolData(data: GetPoolsResponse, options: ProviderSwapOptions): Promise<AdditionalPoolData[]>;
    enrichPoolsWithData(pools: RawPool[], additionalPoolData: AdditionalPoolData[]): RawPool[];
}
interface AdditionalPoolData {
    id: string;
    [key: string]: any;
}

declare class Token {
    readonly chainId: number;
    readonly address: Address$1;
    readonly decimals: number;
    readonly symbol?: string;
    readonly name?: string;
    readonly wrapped: Address$1;
    constructor(chainId: number, address: Address$1, decimals: number, symbol?: string, name?: string, wrapped?: Address$1);
    isEqual(token: Token): boolean;
    isUnderlyingEqual(token: Token): boolean;
    isSameAddress(address: Address$1): boolean;
    toInputToken(): InputToken;
}

type BigintIsh = bigint | string | number;
declare class TokenAmount {
    readonly token: Token;
    readonly scalar: bigint;
    readonly decimalScale: bigint;
    amount: bigint;
    scale18: bigint;
    static fromRawAmount(token: Token, rawAmount: BigintIsh): TokenAmount;
    static fromHumanAmount(token: Token, humanAmount: `${number}`): TokenAmount;
    static fromScale18Amount(token: Token, scale18Amount: BigintIsh, divUp?: boolean): TokenAmount;
    protected constructor(token: Token, amount: BigintIsh);
    add(other: TokenAmount): TokenAmount;
    sub(other: TokenAmount): TokenAmount;
    mulUpFixed(other: bigint): TokenAmount;
    mulDownFixed(other: bigint): TokenAmount;
    divUpFixed(other: bigint): TokenAmount;
    divDownFixed(other: bigint): TokenAmount;
    toSignificant(significantDigits?: number): string;
    toInputAmount(): InputAmount;
}

interface BasePool {
    readonly poolType: PoolType | string;
    readonly id: Hex$1;
    readonly address: string;
    swapFee: bigint;
    tokens: TokenAmount[];
    getNormalizedLiquidity(tokenIn: Token, tokenOut: Token): bigint;
    swapGivenIn(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount, mutateBalances?: boolean): TokenAmount;
    swapGivenOut(tokenIn: Token, tokenOut: Token, swapAmount: TokenAmount, mutateBalances?: boolean): TokenAmount;
    getLimitAmountSwap(tokenIn: Token, tokenOut: Token, swapKind: SwapKind): bigint;
}
interface BasePoolFactory {
    isPoolForFactory(pool: RawPool): boolean;
    create(chainId: number, pool: RawPool): BasePool;
}

interface PathGraphTraversalConfig {
    maxDepth: number;
    maxNonBoostedPathDepth: number;
    maxNonBoostedHopTokensInBoostedPath: number;
    approxPathsToReturn: number;
    poolIdsToInclude?: string[];
}

type Address = `0x${string}`;
type Hex = `0x${string}`;
type SwapInputRawAmount = BigintIsh;
declare enum PoolType {
    Weighted = "Weighted",
    ComposableStable = "ComposableStable",
    MetaStable = "MetaStable",
    AaveLinear = "AaveLinear",
    Fx = "FX",
    Gyro2 = "Gyro2",
    Gyro3 = "Gyro3",
    GyroE = "GyroE"
}
declare enum SwapKind {
    GivenIn = 0,
    GivenOut = 1
}
interface SwapOptions {
    block?: bigint;
    slippage?: bigint;
    funds?: FundManagement;
    deadline?: bigint;
    graphTraversalConfig?: Partial<PathGraphTraversalConfig>;
}
interface FundManagement {
    sender: string;
    fromInternalBalance: boolean;
    recipient: string;
    toInternalBalance: boolean;
}
type SorConfig = {
    chainId: number;
    rpcUrl: string;
    poolDataProviders?: PoolDataProvider | PoolDataProvider[];
    poolDataEnrichers?: PoolDataEnricher | PoolDataEnricher[];
    customPoolFactories?: BasePoolFactory[];
};
interface SingleSwap {
    poolId: Hex;
    kind: SwapKind;
    assetIn: Address;
    assetOut: Address;
    amount: bigint;
    userData: Hex;
}
interface BatchSwapStep {
    poolId: Hex;
    assetInIndex: bigint;
    assetOutIndex: bigint;
    amount: bigint;
    userData: Hex;
}
type InputToken = {
    address: Address;
    decimals: number;
};
type InputAmount = InputToken & {
    rawAmount: bigint;
};
type InputAmountInit = InputAmount | InputAmountInitWeighted;
type InputAmountInitWeighted = InputAmount & {
    weight: bigint;
};

interface OnChainPoolData {
    id: string;
    balances: readonly bigint[];
    totalSupply: bigint;
    swapFee?: bigint;
    amp?: bigint;
    weights?: readonly bigint[];
    wrappedTokenRate?: bigint;
    scalingFactors?: readonly bigint[];
    tokenRates?: readonly bigint[];
    linearTargets?: readonly bigint[];
    poolRate?: bigint;
    isPaused: boolean;
    inRecoveryMode: boolean;
}
declare class OnChainPoolDataEnricher implements PoolDataEnricher {
    private readonly chainId;
    private readonly rpcUrl;
    private readonly batchSize;
    private readonly vault;
    private readonly client;
    constructor(chainId: number, rpcUrl: string, batchSize: number, vault: Address$1);
    fetchAdditionalPoolData(data: GetPoolsResponse, options: SwapOptions): Promise<OnChainPoolData[]>;
    enrichPoolsWithData(pools: RawPool[], additionalPoolData: OnChainPoolData[]): RawPool[];
    private getPoolTokenRate;
}

interface SubgraphPoolProviderConfig {
    retries: number;
    timeout: number;
    poolTypeIn?: string[];
    poolTypeNotIn?: string[];
    poolIdIn?: string[];
    poolIdNotIn?: string[];
    loadActiveWeightUpdates?: boolean;
    loadActiveAmpUpdates?: boolean;
    addFilterToPoolQuery?: boolean;
    gqlAdditionalPoolQueryFields?: string;
}
declare class SubgraphPoolProvider implements PoolDataProvider {
    private readonly url;
    private readonly config;
    constructor(chainId: number, subgraphUrl?: string, config?: Partial<SubgraphPoolProviderConfig>);
    getPools(options: ProviderSwapOptions): Promise<GetPoolsResponse>;
    private fetchDataFromSubgraph;
    private getPoolsQuery;
    private poolMatchesFilter;
}

declare const ZERO_ADDRESS: Address$1;
declare const NATIVE_ADDRESS: Address$1;
declare const MAX_UINT112 = 5192296858534827628530496329220095n;
declare const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
declare const PREMINTED_STABLE_BPT = 2596148429267413814265248164610048n;
declare const DECIMAL_SCALES: {
    0: bigint;
    1: bigint;
    2: bigint;
    3: bigint;
    4: bigint;
    5: bigint;
    6: bigint;
    7: bigint;
    8: bigint;
    9: bigint;
    10: bigint;
    11: bigint;
    12: bigint;
    13: bigint;
    14: bigint;
    15: bigint;
    16: bigint;
    17: bigint;
    18: bigint;
};
declare const SECONDS_PER_YEAR = 31536000n;
declare enum ChainId {
    MAINNET = 1,
    GOERLI = 5,
    OPTIMISM = 10,
    BSC = 56,
    GNOSIS_CHAIN = 100,
    POLYGON = 137,
    ZKSYNC_TESTNET = 280,
    ZKSYNC = 324,
    ZKEVM = 1101,
    ARBITRUM_ONE = 42161,
    AVALANCHE = 43114,
    BASE_GOERLI = 84531,
    FANTOM = 250
}
declare const CHAINS: Record<number, Chain>;
declare const SUBGRAPH_URLS: {
    1: string;
    5: string;
    10: string;
    100: string;
    137: string;
    280: string;
    324: string;
    1101: string;
    42161: string;
    43114: string;
    84531: string;
    250: string;
};
declare const BATCHSIZE: Record<number, number>;
declare const BALANCER_VAULT: Address$1;
declare const BALANCER_RELAYER: Record<number, Address$1>;
/**
 * Deployment Addresses
 * Source: https://docs.balancer.fi/reference/contracts
 */
declare const VAULT: Record<number, Address$1>;
declare const BALANCER_QUERIES: Record<number, Address$1>;
declare const WEIGHTED_POOL_FACTORY: Record<number, Address$1>;
declare const COMPOSABLE_STABLE_POOL_FACTORY: Record<number, Address$1>;
declare const NATIVE_ASSETS: {
    1: Token;
    5: Token;
    100: Token;
    137: Token;
    42161: Token;
    10: Token;
    250: Token;
};
declare const ETH: Token;
declare const DEFAULT_FUND_MANAGMENT: {
    sender: `0x${string}`;
    recipient: `0x${string}`;
    fromInternalBalance: boolean;
    toInternalBalance: boolean;
};
declare const DEFAULT_USERDATA = "0x";
declare const brickedPools: string[];

declare function checkInputs(tokenIn: Token, tokenOut: Token, swapKind: SwapKind, swapAmount: BigintIsh | TokenAmount): TokenAmount;

declare const WAD = 1000000000000000000n;
declare const RAY = 1000000000000000000000000000000000000n;
declare const TWO_WAD = 2000000000000000000n;
declare const FOUR_WAD = 4000000000000000000n;
declare const HUNDRED_WAD = 100000000000000000000n;
declare const abs: (n: bigint) => bigint;
declare const min: (values: bigint[]) => bigint;
declare const max: (values: bigint[]) => bigint;
declare class MathSol {
    static max(a: bigint, b: bigint): bigint;
    static min(a: bigint, b: bigint): bigint;
    static MAX_POW_RELATIVE_ERROR: bigint;
    static mulDownFixed(a: bigint, b: bigint): bigint;
    static mulUpFixed(a: bigint, b: bigint): bigint;
    static divDownFixed(a: bigint, b: bigint): bigint;
    static divUpFixed(a: bigint, b: bigint): bigint;
    static divUp(a: bigint, b: bigint): bigint;
    static powUpFixed(x: bigint, y: bigint, version?: number): bigint;
    static powDownFixed(x: bigint, y: bigint, version?: number): bigint;
    static complementFixed(x: bigint): bigint;
}

/**
 * Extracts a pool's address from its poolId
 * @param poolId - a bytes32 string of the pool's ID
 * @returns the pool's address
 */
declare const getPoolAddress: (poolId: string) => Address;
declare function poolIsLinearPool(poolType: string): boolean;
declare function poolHasVirtualSupply(poolType: string): boolean;
declare function poolHasActualSupply(poolType: string): boolean;
declare function poolHasPercentFee(poolType: string): boolean;

declare class BalancerApiClient {
    apiUrl: string;
    chainId: ChainId;
    constructor(apiUrl: string, chainId: ChainId);
    fetch(requestQuery: {
        operationName?: string;
        query: string;
        variables?: any;
    }): Promise<any>;
}

declare class Slippage {
    amount: bigint;
    decimal: number;
    percentage: number;
    bps: number;
    static fromRawAmount(rawAmount: BigintIsh): Slippage;
    static fromDecimal(decimalAmount: `${number}`): Slippage;
    static fromPercentage(percentageAmount: `${number}`): Slippage;
    static fromBasisPoints(bpsAmount: `${number}`): Slippage;
    protected constructor(amount: BigintIsh);
    applyTo(amount: bigint): bigint;
    removeFrom(amount: bigint): bigint;
}

type PoolState = {
    id: Hex;
    address: Address;
    type: string;
    tokens: MinimalToken[];
    balancerVersion: 2 | 3;
};
type AddLiquidityAmounts = {
    maxAmountsIn: bigint[];
    tokenInIndex: number | undefined;
    minimumBpt: bigint;
};
type RemoveLiquidityAmounts = {
    minAmountsOut: bigint[];
    tokenOutIndex: number | undefined;
    maxBptAmountIn: bigint;
};
type NestedPool = {
    id: Hex;
    address: Address;
    type: PoolType;
    level: number;
    tokens: MinimalToken[];
};
type NestedPoolState = {
    pools: NestedPool[];
    mainTokens: {
        address: Address;
        decimals: number;
    }[];
};
declare enum PoolKind {
    WEIGHTED = 0,
    LEGACY_STABLE = 1,
    COMPOSABLE_STABLE = 2,
    COMPOSABLE_STABLE_V2 = 3
}
type InitPoolAmounts = {
    maxAmountsIn: bigint[];
};
type InitPoolAmountsComposableStable = InitPoolAmounts & {
    amountsIn: bigint[];
};

type AddLiquidityNestedInput = {
    amountsIn: {
        address: Address;
        rawAmount: bigint;
    }[];
    chainId: ChainId;
    rpcUrl: string;
    accountAddress: Address;
    useNativeAssetAsWrappedAmountIn?: boolean;
    fromInternalBalance?: boolean;
};
type AddLiquidityNestedCallAttributes = {
    chainId: ChainId;
    useNativeAssetAsWrappedAmountIn: boolean;
    sortedTokens: Token[];
    poolId: Hex;
    poolAddress: Address;
    poolType: PoolType;
    kind: PoolKind;
    sender: Address;
    recipient: Address;
    maxAmountsIn: {
        amount: bigint;
        isRef: boolean;
    }[];
    minBptOut: bigint;
    fromInternalBalance: boolean;
    outputReference: bigint;
};
type AddLiquidityNestedQueryOutput = {
    callsAttributes: AddLiquidityNestedCallAttributes[];
    amountsIn: TokenAmount[];
    bptOut: TokenAmount;
};
type AddLiquidityNestedCallInput = AddLiquidityNestedQueryOutput & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
    relayerApprovalSignature?: Hex;
};

declare class AddLiquidityNested {
    query(input: AddLiquidityNestedInput, nestedPoolState: NestedPoolState): Promise<AddLiquidityNestedQueryOutput>;
    buildCall(input: AddLiquidityNestedCallInput): {
        call: Hex;
        to: Address;
        value: bigint | undefined;
        minBptOut: bigint;
    };
}

type RemoveLiquidityNestedProportionalInput = {
    bptAmountIn: bigint;
    chainId: ChainId;
    rpcUrl: string;
    accountAddress: Address;
    useNativeAssetAsWrappedAmountOut?: boolean;
    toInternalBalance?: boolean;
};
type RemoveLiquidityNestedSingleTokenInput = RemoveLiquidityNestedProportionalInput & {
    tokenOut: Address;
};
type RemoveLiquidityNestedCallAttributes = {
    chainId: ChainId;
    useNativeAssetAsWrappedAmountOut: boolean;
    sortedTokens: Token[];
    poolId: Address;
    poolAddress: Address;
    poolType: PoolType;
    kind: PoolKind;
    sender: Address;
    recipient: Address;
    bptAmountIn: {
        amount: bigint;
        isRef: boolean;
    };
    minAmountsOut: bigint[];
    toInternalBalance: boolean;
    outputReferences: {
        key: bigint;
        index: bigint;
    }[];
    tokenOutIndex?: number;
};
type RemoveLiquidityNestedQueryOutput = {
    callsAttributes: RemoveLiquidityNestedCallAttributes[];
    bptAmountIn: TokenAmount;
    amountsOut: TokenAmount[];
    isProportional: boolean;
};
type RemoveLiquidityNestedCallInput = RemoveLiquidityNestedQueryOutput & {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
    relayerApprovalSignature?: Hex;
};

declare class RemoveLiquidityNested {
    query(input: RemoveLiquidityNestedProportionalInput | RemoveLiquidityNestedSingleTokenInput, nestedPoolState: NestedPoolState): Promise<RemoveLiquidityNestedQueryOutput>;
    buildCall(input: RemoveLiquidityNestedCallInput): {
        call: Hex;
        to: Address;
        minAmountsOut: TokenAmount[];
    };
}

declare enum AddLiquidityKind {
    Init = "Init",
    Unbalanced = "Unbalanced",
    SingleToken = "SingleToken",
    Proportional = "Proportional"
}
type AddLiquidityBaseInput = {
    chainId: number;
    rpcUrl: string;
    useNativeAssetAsWrappedAmountIn?: boolean;
    fromInternalBalance?: boolean;
};
type AddLiquidityUnbalancedInput = AddLiquidityBaseInput & {
    amountsIn: InputAmount[];
    kind: AddLiquidityKind.Unbalanced;
};
type AddLiquiditySingleTokenInput = AddLiquidityBaseInput & {
    bptOut: InputAmount;
    tokenIn: Address;
    kind: AddLiquidityKind.SingleToken;
};
type AddLiquidityProportionalInput = AddLiquidityBaseInput & {
    bptOut: InputAmount;
    kind: AddLiquidityKind.Proportional;
};
type AddLiquidityInput = AddLiquidityUnbalancedInput | AddLiquiditySingleTokenInput | AddLiquidityProportionalInput;
type AddLiquidityBaseQueryOutput = {
    poolType: string;
    poolId: Hex;
    addLiquidityKind: AddLiquidityKind;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
    fromInternalBalance: boolean;
    tokenInIndex?: number;
    balancerVersion: 2 | 3;
};
type AddLiquidityWeightedQueryOutput = AddLiquidityBaseQueryOutput;
type AddLiquidityComposableStableQueryOutput = AddLiquidityBaseQueryOutput & {
    bptIndex: number;
};
type AddLiquidityQueryOutput = AddLiquidityWeightedQueryOutput | AddLiquidityComposableStableQueryOutput;
type AddLiquidityBaseCall = {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};
type AddLiquidityComposableStableCall = AddLiquidityBaseCall & AddLiquidityComposableStableQueryOutput;
type AddLiquidityWeightedCall = AddLiquidityBaseCall & AddLiquidityBaseQueryOutput;
type AddLiquidityCall = AddLiquidityWeightedCall | AddLiquidityComposableStableCall;
interface AddLiquidityBase {
    query(input: AddLiquidityInput, poolState: PoolState): Promise<AddLiquidityQueryOutput>;
    buildCall(input: AddLiquidityCall): AddLiquidityBuildOutput;
}
type AddLiquidityBuildOutput = {
    call: Hex;
    to: Address;
    value: bigint;
    minBptOut: TokenAmount;
    maxAmountsIn: TokenAmount[];
};
type AddLiquidityConfig = {
    customAddLiquidityTypes: Record<string, AddLiquidityBase>;
};

declare class AddLiquidity implements AddLiquidityBase {
    config?: AddLiquidityConfig | undefined;
    constructor(config?: AddLiquidityConfig | undefined);
    private readonly inputValidator;
    query(input: AddLiquidityInput, poolState: PoolState): Promise<AddLiquidityQueryOutput>;
    buildCall(input: AddLiquidityCall): AddLiquidityBuildOutput;
}

interface CreatePoolBase {
    buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput;
}
type CreatePoolBaseInput = {
    name?: string;
    symbol: string;
    swapFee: string;
    poolOwnerAddress: Address$1;
    salt?: Hex$1;
    balancerVersion: 2 | 3;
};
type CreatePoolWeightedInput = CreatePoolBaseInput & {
    poolType: PoolType.Weighted;
    tokens: {
        tokenAddress: Address$1;
        rateProvider: Address$1;
        weight: bigint;
    }[];
};
type CreatePoolComposableStableInput = CreatePoolBaseInput & {
    poolType: PoolType.ComposableStable;
    tokens: {
        tokenAddress: Address$1;
        rateProvider: Address$1;
        tokenRateCacheDuration: bigint;
    }[];
    amplificationParameter: bigint;
    exemptFromYieldProtocolFeeFlag: boolean;
};
type CreatePoolInput = CreatePoolWeightedInput | CreatePoolComposableStableInput;
type CreatePoolBuildCallOutput = {
    call: Hex$1;
};
type CreatePoolWeightedArgs = [
    string,
    string,
    Address$1[],
    bigint[],
    Address$1[],
    bigint,
    Address$1,
    Hex$1
];
type CreatePoolComposableStableArgs = [
    string,
    string,
    Address$1[],
    bigint,
    Address$1[],
    bigint[],
    boolean,
    bigint,
    Address$1,
    Hex$1
];

declare class CreatePool implements CreatePoolBase {
    private readonly inputValidator;
    constructor();
    buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput;
}

declare enum RemoveLiquidityKind {
    Unbalanced = "Unbalanced",
    SingleToken = "SingleToken",
    Proportional = "Proportional"
}
type RemoveLiquidityBaseInput = {
    chainId: number;
    rpcUrl: string;
    toNativeAsset?: boolean;
    toInternalBalance?: boolean;
};
type RemoveLiquidityUnbalancedInput = RemoveLiquidityBaseInput & {
    amountsOut: InputAmount[];
    kind: RemoveLiquidityKind.Unbalanced;
};
type RemoveLiquiditySingleTokenInput = RemoveLiquidityBaseInput & {
    bptIn: InputAmount;
    tokenOut: Address;
    kind: RemoveLiquidityKind.SingleToken;
};
type RemoveLiquidityProportionalInput = RemoveLiquidityBaseInput & {
    bptIn: InputAmount;
    kind: RemoveLiquidityKind.Proportional;
};
type RemoveLiquidityInput = RemoveLiquidityUnbalancedInput | RemoveLiquiditySingleTokenInput | RemoveLiquidityProportionalInput;
type RemoveLiquidityQueryOutput = RemoveLiquidityBaseQueryOutput | RemoveLiquidityComposableStableQueryOutput;
type RemoveLiquidityBaseQueryOutput = {
    poolType: string;
    poolId: Address;
    removeLiquidityKind: RemoveLiquidityKind;
    bptIn: TokenAmount;
    amountsOut: TokenAmount[];
    tokenOutIndex?: number;
    toInternalBalance: boolean;
    balancerVersion: 2 | 3;
};
type RemoveLiquidityComposableStableQueryOutput = RemoveLiquidityBaseQueryOutput & {
    bptIndex: number;
};
type RemoveLiquidityBaseCall = {
    slippage: Slippage;
    sender: Address;
    recipient: Address;
};
type RemoveLiquidityComposableStableCall = RemoveLiquidityBaseCall & RemoveLiquidityComposableStableQueryOutput;
type RemoveLiquidityWeightedCall = RemoveLiquidityBaseCall & RemoveLiquidityBaseQueryOutput;
type RemoveLiquidityCall = RemoveLiquidityComposableStableCall | RemoveLiquidityWeightedCall;
type RemoveLiquidityBuildOutput = {
    call: Address;
    to: Address;
    value: bigint;
    maxBptIn: TokenAmount;
    minAmountsOut: TokenAmount[];
};
interface RemoveLiquidityBase {
    query(input: RemoveLiquidityInput, poolState: PoolState): Promise<RemoveLiquidityQueryOutput>;
    buildCall(input: RemoveLiquidityCall): RemoveLiquidityBuildOutput;
}
type RemoveLiquidityConfig = {
    customRemoveLiquidityTypes: Record<string, RemoveLiquidityBase>;
};
type ExitPoolRequest = {
    assets: Address[];
    minAmountsOut: bigint[];
    userData: Address;
    toInternalBalance: boolean;
};

declare enum WeightedPoolJoinKind {
    INIT = 0,
    EXACT_TOKENS_IN_FOR_BPT_OUT = 1,
    TOKEN_IN_FOR_EXACT_BPT_OUT = 2,
    ALL_TOKENS_IN_FOR_EXACT_BPT_OUT = 3
}
declare enum WeightedPoolExitKind {
    EXACT_BPT_IN_FOR_ONE_TOKEN_OUT = 0,
    EXACT_BPT_IN_FOR_TOKENS_OUT = 1,
    BPT_IN_FOR_EXACT_TOKENS_OUT = 2,
    MANAGEMENT_FEE_TOKENS_OUT = 3
}
declare class WeightedEncoder {
    /**
     * Cannot be constructed.
     */
    private constructor();
    /**
     * Encodes the User Data for initializing a WeightedPool
     * @param amounts Amounts of tokens to be added to the pool
     * @returns
     */
    static encodeInitPoolUserData(amounts: InitPoolAmounts): `0x${string}`;
    /**
     * Encodes the User Data for adding liquidity to a WeightedPool
     * @param kind Kind of the Add Liquidity operation: Init, Unbalanced, SingleToken, Proportional
     * @param amounts Amounts of tokens to be added to the pool
     * @returns
     */
    static encodeAddLiquidityUserData(kind: AddLiquidityKind, amounts: AddLiquidityAmounts): `0x${string}`;
    /**
     * Encodes the User Data for removing liquidity from a WeightedPool
     * @param kind Kind of the Remove Liquidity operation: Unbalanced, SingleToken, Proportional
     * @param amounts Amounts of tokens to be removed from the pool
     * @returns
     */
    static encodeRemoveLiquidityUserData(kind: RemoveLiquidityKind, amounts: RemoveLiquidityAmounts): Address;
    /**
     * Encodes the userData parameter for providing the initial liquidity to a WeightedPool
     * @param initialBalances - the amounts of tokens to send to the pool to form the initial balances
     */
    static initPool: (amountsIn: bigint[]) => Address;
    /**
     * Encodes the userData parameter for adding liquidity to a WeightedPool with exact token inputs
     * @param amountsIn - the amounts each of token to deposit in the pool as liquidity
     * @param minimumBPT - the minimum acceptable BPT to receive in return for deposited tokens
     */
    static addLiquidityUnbalanced: (amountsIn: bigint[], minimumBPT: bigint) => Address;
    /**
     * Encodes the userData parameter for adding liquidity to a WeightedPool with a single token to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     * @param tokenIndex - the index of the token to be provided as liquidity
     */
    static addLiquiditySingleToken: (bptAmountOut: bigint, tokenIndex: number) => Address;
    /**
     * Encodes the userData parameter for adding liquidity to a WeightedPool proportionally to receive an exact amount of BPT
     * @param bptAmountOut - the amount of BPT to be minted
     */
    static addLiquidityProportional: (bptAmountOut: bigint) => Address;
    /**
     * Encodes the userData parameter for removing liquidity from a WeightedPool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     * @param tokenIndex - the index of the token to removed from the pool
     */
    static removeLiquiditySingleToken: (bptAmountIn: bigint, tokenIndex: number) => Address;
    /**
     * Encodes the userData parameter for removing liquidity from a WeightedPool by removing tokens in return for an exact amount of BPT
     * @param bptAmountIn - the amount of BPT to be burned
     */
    static removeLiquidityProportional: (bptAmountIn: bigint) => Address;
    /**
     * Encodes the userData parameter for removing liquidity from a WeightedPool by removing exact amounts of tokens
     * @param amountsOut - the amounts of each token to be withdrawn from the pool
     * @param maxBPTAmountIn - the minimum acceptable BPT to burn in return for withdrawn tokens
     */
    static removeLiquidityUnbalanced: (amountsOut: bigint[], maxBPTAmountIn: bigint) => Address;
}

declare const getEncoder: (poolType: SupportedRawPoolTypes | string) => typeof WeightedEncoder | undefined;

interface InitPoolBase {
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput;
}
type InitPoolBuildOutput = Omit<AddLiquidityBuildOutput, 'minBptOut' | 'maxAmountsIn'>;
type InitPoolInput = Omit<AddLiquidityBaseInput, 'rpcUrl'> & {
    sender: Address$1;
    recipient: Address$1;
    amountsIn: InputAmountInit[];
    kind: AddLiquidityKind.Init;
};
type InitPoolConfig = {
    initPoolTypes: Record<string, InitPoolBase>;
};

interface InputValidatorBase {
    validateAddLiquidity(addLiquidityInput: AddLiquidityInput | InitPoolInput, poolState: PoolState): void;
    validateRemoveLiquidity(input: RemoveLiquidityInput, poolState: PoolState): void;
    validateCreatePool(input: CreatePoolInput): void;
}

declare class InputValidator {
    validators: Record<string, InputValidatorBase>;
    constructor();
    getValidator(poolType: string): InputValidatorBase;
    validateAddLiquidity(addLiquidityInput: AddLiquidityInput | InitPoolInput, poolState: PoolState): void;
    validateRemoveLiquidity(removeLiquidityInput: any, poolState: any): void;
    validateCreatePool(input: CreatePoolInput): void;
}

declare class InitPool {
    config?: InitPoolConfig | undefined;
    inputValidator: InputValidator;
    constructor(config?: InitPoolConfig | undefined);
    buildCall(input: InitPoolInput, poolState: PoolState): InitPoolBuildOutput;
}

declare class Path {
    readonly pools: BasePool[];
    readonly tokens: Token[];
    constructor(tokens: Token[], pools: BasePool[]);
}
declare class PathWithAmount extends Path {
    readonly swapAmount: TokenAmount;
    readonly swapKind: SwapKind;
    readonly outputAmount: TokenAmount;
    readonly inputAmount: TokenAmount;
    private readonly mutateBalances;
    private readonly printPath;
    constructor(tokens: Token[], pools: BasePool[], swapAmount: TokenAmount, mutateBalances?: boolean);
    print(): void;
}

declare class PriceImpactAmount {
    amount: bigint;
    decimal: number;
    percentage: number;
    bps: number;
    static fromRawAmount(rawAmount: BigintIsh): PriceImpactAmount;
    static fromDecimal(decimalAmount: `${number}`): PriceImpactAmount;
    static fromPercentage(percentageAmount: `${number}`): PriceImpactAmount;
    static fromBasisPoints(bpsAmount: `${number}`): PriceImpactAmount;
    protected constructor(amount: BigintIsh);
}

type SingleSwapInput = SingleSwap & {
    rpcUrl: string;
    chainId: ChainId;
};

declare class PriceImpact {
    static addLiquiditySingleToken: (input: AddLiquiditySingleTokenInput, poolState: PoolState) => Promise<PriceImpactAmount>;
    static addLiquidityUnbalanced: (input: AddLiquidityUnbalancedInput, poolState: PoolState) => Promise<PriceImpactAmount>;
    static removeLiquidity: (input: RemoveLiquiditySingleTokenInput | RemoveLiquidityUnbalancedInput, poolState: PoolState) => Promise<PriceImpactAmount>;
    static singleSwap: ({ poolId, kind, assetIn, assetOut, amount, userData, rpcUrl, chainId, }: SingleSwapInput) => Promise<PriceImpactAmount>;
}

declare class RemoveLiquidity implements RemoveLiquidityBase {
    config?: RemoveLiquidityConfig | undefined;
    private readonly inputValidator;
    constructor(config?: RemoveLiquidityConfig | undefined);
    query(input: RemoveLiquidityInput, poolState: PoolState): Promise<RemoveLiquidityQueryOutput>;
    buildCall(input: RemoveLiquidityCall): RemoveLiquidityBuildOutput;
}

declare class Swap {
    constructor({ paths, swapKind, }: {
        paths: PathWithAmount[];
        swapKind: SwapKind;
    });
    readonly chainId: number;
    readonly isBatchSwap: boolean;
    readonly paths: PathWithAmount[];
    readonly pathsImmutable: PathWithAmount[];
    readonly assets: Address$1[];
    readonly swapKind: SwapKind;
    swaps: BatchSwapStep[] | SingleSwap;
    get quote(): TokenAmount;
    get inputAmount(): TokenAmount;
    get outputAmount(): TokenAmount;
    query(rpcUrl?: string, block?: bigint): Promise<TokenAmount>;
    private convertNativeAddressToZero;
    queryCallData(): string;
    get priceImpact(): PriceImpactAmount;
    private getSwaps;
    private getInputAmount;
    private getOutputAmount;
}

declare function doAddLiquidityQuery(rpcUrl: string, chainId: number, args: readonly [
    Address,
    Address,
    Address,
    {
        assets: readonly Address[];
        maxAmountsIn: readonly bigint[];
        userData: Address;
        fromInternalBalance: boolean;
    }
]): Promise<{
    bptOut: bigint;
    amountsIn: readonly bigint[];
}>;

/**
 * Get amounts from array of TokenAmounts returning default if not a value for tokens.
 * @param tokens
 * @param amounts
 * @param defaultAmount
 * @returns
 */
declare function getAmounts(tokens: Token[], amounts: InputAmount[], defaultAmount?: bigint): bigint[];

declare function getSortedTokens(tokens: MinimalToken[], chainId: number): Token[];

declare function parseAddLiquidityArgs({ useNativeAssetAsWrappedAmountIn, chainId, sortedTokens, poolId, sender, recipient, maxAmountsIn, userData, fromInternalBalance, }: {
    chainId?: number;
    useNativeAssetAsWrappedAmountIn?: boolean;
    sortedTokens: Token[];
    poolId: Hex;
    sender: Address;
    recipient: Address;
    maxAmountsIn: readonly bigint[];
    userData: Hex;
    fromInternalBalance: boolean;
}): {
    args: readonly [`0x${string}`, `0x${string}`, `0x${string}`, {
        assets: `0x${string}`[];
        maxAmountsIn: readonly bigint[];
        userData: `0x${string}`;
        fromInternalBalance: boolean;
    }];
    tokensIn: Token[];
};

declare function replaceWrapped(tokens: Token[], chainId: number): Token[];

declare function constraintValidation(nestedPoolState: NestedPoolState): boolean;

declare class Pools {
    private readonly balancerApiClient;
    readonly poolStateQuery = "query GetPool($id: String!){\n    poolGetPool(id:$id) {\n      id\n      address\n      name\n      type\n      version\n      ... on GqlPoolWeighted {\n        tokens {\n          ... on GqlPoolTokenBase {\n            address\n             decimals\n            index\n          }\n        }\n      }\n      ... on GqlPoolStable {\n        tokens {\n          ... on GqlPoolTokenBase {\n            address\n             decimals\n            index\n          }\n        }\n      }\n      ... on GqlPoolComposableStable {\n        tokens {\n          ... on GqlPoolTokenBase {\n            address\n             decimals\n            index\n          }\n        }\n      }\n      ... on GqlPoolGyro {\n        tokens {\n          ... on GqlPoolTokenBase {\n            address\n             decimals\n            index\n          }\n        }\n      }\n      ... on GqlPoolLiquidityBootstrapping {\n        tokens {\n          ... on GqlPoolTokenBase {\n            address\n             decimals\n            index\n          }\n        }\n      }\n      ... on GqlPoolElement {\n        tokens {\n          ... on GqlPoolTokenBase {\n            address\n             decimals\n            index\n          }\n        }\n      }\n      ... on GqlPoolLiquidityBootstrapping {\n        tokens {\n          ... on GqlPoolTokenBase {\n            address\n             decimals\n            index\n          }\n        }\n      }\n    }\n}";
    constructor(balancerApiClient: BalancerApiClient);
    fetchPoolState(id: string): Promise<PoolState>;
}

type PoolGetPool = {
    id: Hex;
    address: Address;
    name: string;
    type: string;
    version: string;
    nestingType: string;
    allTokens: {
        address: Address;
        name: string;
        symbol: string;
        decimals: number;
        isMainToken: boolean;
    }[];
    tokens: {
        index: number;
        name: string;
        symbol: string;
        address: Address;
        decimals: number;
        pool?: {
            id: Hex;
            name: string;
            symbol: string;
            address: Address;
            type: string;
            tokens: {
                index: number;
                name: string;
                symbol: string;
                address: Address;
                decimals: number;
            }[];
        };
    }[];
};
declare class NestedPools {
    private readonly balancerApiClient;
    readonly nestedPoolStateQuery = "\n    query GetPool($id: String!){\n      poolGetPool(id:$id) {\n        id\n        address\n        name\n        type\n        version\n        allTokens {\n          id\n          address\n          name\n          symbol\n          decimals\n          isNested\n          isPhantomBpt\n          isMainToken\n        }\n        ... on GqlPoolWeighted {\n          nestingType\n          tokens {\n            ... on GqlPoolToken {\n              ...GqlPoolToken\n            }\n            ... on GqlPoolTokenLinear {\n              ...GqlPoolTokenLinear\n            }\n            ... on GqlPoolTokenPhantomStable {\n              ...GqlPoolTokenPhantomStable\n            }\n          }\n        }\n        ... on GqlPoolPhantomStable {\n          amp\n          nestingType\n          tokens {\n            ... on GqlPoolToken {\n              ...GqlPoolToken\n            }\n            ... on GqlPoolTokenLinear {\n              ...GqlPoolTokenLinear\n            }\n            ... on GqlPoolTokenPhantomStable {\n              ...GqlPoolTokenPhantomStable\n            }\n          }\n        }\n        ... on GqlPoolLiquidityBootstrapping {\n          name\n          nestingType\n          tokens {\n            ... on GqlPoolToken {\n              ...GqlPoolToken\n            }\n            ... on GqlPoolTokenLinear {\n              ...GqlPoolTokenLinear\n            }\n            ... on GqlPoolTokenPhantomStable {\n              ...GqlPoolTokenPhantomStable\n            }\n          }\n        }\n      }\n    }\n\n    fragment GqlPoolToken on GqlPoolToken {\n      index\n      name\n      symbol\n      address\n      decimals\n    }\n    \n    fragment GqlPoolTokenLinear on GqlPoolTokenLinear {\n      index\n      name\n      symbol\n      address\n      decimals\n      pool {\n        id\n        name\n        symbol\n        address\n        type\n        tokens {\n          ... on GqlPoolToken {\n            ...GqlPoolToken\n          }\n        }\n      }\n    }\n    \n    fragment GqlPoolTokenPhantomStable on GqlPoolTokenPhantomStable {\n      index\n      name\n      symbol\n      address\n      decimals\n      pool {\n        id\n        name\n        symbol\n        address\n        type\n        tokens {\n          ... on GqlPoolToken {\n            ...GqlPoolToken\n          }\n          ... on GqlPoolTokenLinear {\n            ...GqlPoolTokenLinear\n          }\n        }\n      }\n    }";
    constructor(balancerApiClient: BalancerApiClient);
    fetchNestedPoolState: (id: string) => Promise<NestedPoolState>;
    mapPoolToNestedPoolState: (pool: PoolGetPool) => NestedPoolState;
    mapPoolType: (type: string) => PoolType;
}

declare class BalancerApi {
    balancerApiClient: BalancerApiClient;
    pools: Pools;
    nestedPools: NestedPools;
    constructor(balancerApiUrl: string, chainId: ChainId);
}

declare class SmartOrderRouter {
    private readonly chainId;
    private readonly router;
    private readonly poolParser;
    private readonly poolDataService;
    private pools;
    private blockNumber;
    private poolsProviderData;
    constructor({ chainId, rpcUrl, poolDataProviders, poolDataEnrichers, customPoolFactories, }: SorConfig);
    fetchAndCachePools(blockNumber?: bigint): Promise<BasePool[]>;
    fetchAndCacheLatestPoolEnrichmentData(blockNumber?: bigint): Promise<void>;
    get isInitialized(): boolean;
    getSwaps(tokenIn: Token, tokenOut: Token, swapKind: SwapKind, swapAmount: SwapInputRawAmount | TokenAmount, swapOptions?: SwapOptions): Promise<Swap | null>;
    getCandidatePaths(tokenIn: Token, tokenOut: Token, options?: Pick<SwapOptions, 'block' | 'graphTraversalConfig'>): Promise<Path[]>;
}

declare function sorParseRawPools(chainId: ChainId, pools: RawPool[], customPoolFactories?: BasePoolFactory[]): BasePool[];
declare function sorGetSwapsWithPools(tokenIn: Token, tokenOut: Token, swapKind: SwapKind, swapAmount: SwapInputRawAmount | TokenAmount, pools: BasePool[], swapOptions?: Omit<SwapOptions, 'graphTraversalConfig.poolIdsToInclude'>): Promise<Swap | null>;

export { AddLiquidity, AddLiquidityAmounts, AddLiquidityBase, AddLiquidityBaseInput, AddLiquidityBuildOutput, AddLiquidityCall, AddLiquidityComposableStableCall, AddLiquidityComposableStableQueryOutput, AddLiquidityConfig, AddLiquidityInput, AddLiquidityKind, AddLiquidityNested, AddLiquidityProportionalInput, AddLiquidityQueryOutput, AddLiquiditySingleTokenInput, AddLiquidityUnbalancedInput, AddLiquidityWeightedCall, AddLiquidityWeightedQueryOutput, AdditionalPoolData, Address, BALANCER_QUERIES, BALANCER_RELAYER, BALANCER_VAULT, BATCHSIZE, BalancerApi, BasePool, BasePoolFactory, BatchSwapStep, BigintIsh, CHAINS, COMPOSABLE_STABLE_POOL_FACTORY, ChainId, CreatePool, CreatePoolBase, CreatePoolBaseInput, CreatePoolBuildCallOutput, CreatePoolComposableStableArgs, CreatePoolComposableStableInput, CreatePoolInput, CreatePoolWeightedArgs, CreatePoolWeightedInput, DECIMAL_SCALES, DEFAULT_FUND_MANAGMENT, DEFAULT_USERDATA, ETH, ExitPoolRequest, FOUR_WAD, FundManagement, GetPoolsResponse, HUNDRED_WAD, Hex, HumanAmount, InitPool, InitPoolAmounts, InitPoolAmountsComposableStable, InitPoolBase, InitPoolBuildOutput, InitPoolConfig, InitPoolInput, InputAmount, InputAmountInit, InputAmountInitWeighted, InputToken, MAX_UINT112, MAX_UINT256, MathSol, MinimalToken, NATIVE_ADDRESS, NATIVE_ASSETS, NestedPool, NestedPoolState, OnChainPoolData, OnChainPoolDataEnricher, PREMINTED_STABLE_BPT, Path, PathWithAmount, PoolDataEnricher, PoolDataProvider, PoolKind, PoolState, PoolType, PriceImpact, PriceImpactAmount, ProviderSwapOptions, RAY, RawBasePool, RawBaseStablePool, RawComposableStablePool, RawFxPool, RawFxPoolToken, RawGyro2Pool, RawGyro3Pool, RawGyroEPool, RawLinearPool, RawMetaStablePool, RawPool, RawPoolToken, RawPoolTokenWithRate, RawStablePool, RawWeightedPool, RawWeightedPoolToken, RemoveLiquidity, RemoveLiquidityAmounts, RemoveLiquidityBase, RemoveLiquidityBaseInput, RemoveLiquidityBaseQueryOutput, RemoveLiquidityBuildOutput, RemoveLiquidityCall, RemoveLiquidityComposableStableCall, RemoveLiquidityComposableStableQueryOutput, RemoveLiquidityConfig, RemoveLiquidityInput, RemoveLiquidityKind, RemoveLiquidityNested, RemoveLiquidityProportionalInput, RemoveLiquidityQueryOutput, RemoveLiquiditySingleTokenInput, RemoveLiquidityUnbalancedInput, RemoveLiquidityWeightedCall, SECONDS_PER_YEAR, SUBGRAPH_URLS, SingleSwap, Slippage, SmartOrderRouter, SorConfig, SubgraphPoolProvider, SupportedRawPoolTypes, Swap, SwapInputRawAmount, SwapKind, SwapOptions, TWO_WAD, Token, TokenAmount, VAULT, WAD, WEIGHTED_POOL_FACTORY, WeightedEncoder, WeightedPoolExitKind, WeightedPoolJoinKind, ZERO_ADDRESS, abs, brickedPools, checkInputs, constraintValidation, doAddLiquidityQuery, getAmounts, getEncoder, getPoolAddress, getSortedTokens, max, min, parseAddLiquidityArgs, poolHasActualSupply, poolHasPercentFee, poolHasVirtualSupply, poolIsLinearPool, replaceWrapped, sorGetSwapsWithPools, sorParseRawPools };
