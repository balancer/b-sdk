// pnpm test -- addLiquidityNested.integration.test.ts
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
    CHAINS,
    ChainId,
    Hex,
    NestedPoolState,
    PublicWalletClient,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    AddLiquidityNestedTxInput,
    assertResults,
    doAddLiquidityNested,
    forkSetup,
    POOLS,
    TestToken,
    TOKENS,
} from 'test/lib/utils';

const chainId = ChainId.MAINNET;
const DAI = TOKENS[chainId].DAI;
const WETH = TOKENS[chainId].WETH;
const USDC = TOKENS[chainId].USDC;
const USDT = TOKENS[chainId].USDT;
const BPT_3POOL = POOLS[chainId].BPT_3POOL;
const BPT_WETH_3POOL = POOLS[chainId].BPT_WETH_3POOL;

describe('add liquidity nested test', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let poolId: Hex;
    let testAddress: Address;
    let mainTokens: TestToken[];
    let initialBalances: bigint[];
    let txInput: AddLiquidityNestedTxInput;

    beforeAll(async () => {
        // setup chain and test client
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        poolId = BPT_WETH_3POOL.id;

        // setup mock api
        const api = new MockApi();
        // get pool state from api
        const nestedPoolState = await api.getNestedPool(poolId);

        mainTokens = [WETH, DAI, USDC, USDT];
        initialBalances = mainTokens.map((t) => parseUnits('1000', t.decimals));

        txInput = {
            nestedPoolState,
            chainId,
            rpcUrl,
            testAddress,
            client,
            amountsIn: [],
        };
    });

    beforeEach(async () => {
        // User approve vault to spend their tokens and update user balance
        await forkSetup(
            client,
            testAddress,
            mainTokens.map((t) => t.address),
            mainTokens.map((t) => t.slot) as number[],
            initialBalances,
        );
    });

    test('single token', async () => {
        const amountsIn = [
            {
                address: WETH.address,
                rawAmount: parseUnits('1', WETH.decimals),
                decimals: WETH.decimals,
            },
        ];

        txInput = {
            ...txInput,
            amountsIn,
        };

        const {
            transactionReceipt,
            balanceDeltas,
            bptOut,
            minBptOut,
            slippage,
            value,
        } = await doAddLiquidityNested(txInput);

        assertResults(
            transactionReceipt,
            bptOut,
            amountsIn,
            balanceDeltas,
            slippage,
            minBptOut,
            chainId,
            value,
        );
    });

    test('all tokens', async () => {
        const amountsIn = mainTokens.map((t) => ({
            address: t.address,
            rawAmount: parseUnits('1', t.decimals),
            decimals: t.decimals,
        }));

        txInput = {
            ...txInput,
            amountsIn,
        };

        const {
            transactionReceipt,
            balanceDeltas,
            bptOut,
            minBptOut,
            slippage,
            value,
        } = await doAddLiquidityNested(txInput);

        assertResults(
            transactionReceipt,
            bptOut,
            amountsIn,
            balanceDeltas,
            slippage,
            minBptOut,
            chainId,
            value,
        );
    });

    test('native asset', async () => {
        const amountsIn = mainTokens.map((t) => ({
            address: t.address,
            rawAmount: parseUnits('1', t.decimals),
            decimals: t.decimals,
        }));

        const wethIsEth = true;

        txInput = {
            ...txInput,
            amountsIn,
            wethIsEth,
        };

        const {
            transactionReceipt,
            balanceDeltas,
            bptOut,
            minBptOut,
            slippage,
            value,
        } = await doAddLiquidityNested(txInput);

        assertResults(
            transactionReceipt,
            bptOut,
            amountsIn,
            balanceDeltas,
            slippage,
            minBptOut,
            chainId,
            value,
            wethIsEth,
        );
    });

    test('native asset - invalid input', async () => {
        const amountsIn = [
            {
                address: USDC.address,
                rawAmount: parseUnits('1', USDC.decimals),
                decimals: USDC.decimals,
            },
        ];

        const wethIsEth = true;

        txInput = {
            ...txInput,
            amountsIn,
            wethIsEth,
        };

        await expect(() => doAddLiquidityNested(txInput)).rejects.toThrowError(
            'Adding liquidity with native asset requires wrapped native asset to exist within amountsIn',
        );
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getNestedPool(poolId: Hex): Promise<NestedPoolState> {
        if (poolId !== BPT_WETH_3POOL.id) throw Error();
        return {
            protocolVersion: 2,
            pools: [
                {
                    id: BPT_WETH_3POOL.id,
                    address: BPT_WETH_3POOL.address,
                    type: BPT_WETH_3POOL.type,
                    level: 1,
                    tokens: [
                        {
                            address: BPT_3POOL.address,
                            decimals: BPT_3POOL.decimals,
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
                    id: BPT_3POOL.id,
                    address: BPT_3POOL.address,
                    type: BPT_3POOL.type,
                    level: 0,
                    tokens: [
                        {
                            address: DAI.address,
                            decimals: DAI.decimals,
                            index: 0,
                        },
                        {
                            address: BPT_3POOL.address,
                            decimals: BPT_3POOL.decimals,
                            index: 1,
                        },
                        {
                            address: USDC.address,
                            decimals: USDC.decimals,
                            index: 2,
                        },
                        {
                            address: USDT.address,
                            decimals: USDT.decimals,
                            index: 3,
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
                {
                    address: USDT.address,
                    decimals: USDT.decimals,
                },
            ],
        };
    }
}
