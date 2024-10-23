// pnpm test -- removeLiquidityNestedV3.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';

import {
    Address,
    ChainId,
    CHAINS,
    NestedPoolState,
    PublicWalletClient,
    Token,
    RemoveLiquidityNestedInput,
    RemoveLiquidityNested,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { POOLS, setTokenBalances, TOKENS } from 'test/lib/utils';

const chainId = ChainId.SEPOLIA;
const NESTED_WITH_BOOSTED_POOL = POOLS[chainId].NESTED_WITH_BOOSTED_POOL;
const BOOSTED_POOL = POOLS[chainId].MOCK_BOOSTED_POOL;
const DAI = TOKENS[chainId].DAI_AAVE;
const USDC = TOKENS[chainId].USDC_AAVE;
const WETH = TOKENS[chainId].WETH;

const parentBptToken = new Token(
    chainId,
    NESTED_WITH_BOOSTED_POOL.address,
    NESTED_WITH_BOOSTED_POOL.decimals,
);

describe('V3 remove liquidity nested test, with Permit direct approval', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    const removeLiquidityNested = new RemoveLiquidityNested();

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        // Mint BPT to testAddress
        await setTokenBalances(
            client,
            testAddress,
            [parentBptToken.address],
            [0],
            [parseUnits('10', 18)],
        );
    });

    test('query with underlying', async () => {
        const addLiquidityInput: RemoveLiquidityNestedInput = {
            bptAmountIn: parseUnits('7', 18),
            chainId,
            rpcUrl,
        };
        const queryOutput = await removeLiquidityNested.query(
            addLiquidityInput,
            nestedPoolState,
        );
        console.log(queryOutput);
        /*
            protocolVersion: 1 | 2 | 3;
    callsAttributes: RemoveLiquidityNestedCallAttributes[];
    bptAmountIn: TokenAmount;
    amountsOut: TokenAmount[];
    isProportional: boolean;
    chainId: ChainId;*/
    });
});

const nestedPoolState: NestedPoolState = {
    protocolVersion: 3,
    pools: [
        {
            id: NESTED_WITH_BOOSTED_POOL.id,
            address: NESTED_WITH_BOOSTED_POOL.address,
            type: NESTED_WITH_BOOSTED_POOL.type,
            level: 1,
            tokens: [
                {
                    address: BOOSTED_POOL.address,
                    decimals: BOOSTED_POOL.decimals,
                    index: 0,
                },
                {
                    address: WETH.address,
                    decimals: WETH.decimals,
                    index: 1,
                },
            ],
        },
        {
            id: BOOSTED_POOL.id,
            address: BOOSTED_POOL.address,
            type: BOOSTED_POOL.type,
            level: 0,
            tokens: [
                {
                    address: USDC.address,
                    decimals: USDC.decimals,
                    index: 0,
                },
                {
                    address: DAI.address,
                    decimals: DAI.decimals,
                    index: 1,
                },
            ],
        },
    ],
    mainTokens: [
        {
            address: WETH.address,
            decimals: WETH.decimals,
        },
        {
            address: DAI.address,
            decimals: DAI.decimals,
        },
        {
            address: USDC.address,
            decimals: USDC.decimals,
        },
    ],
};
