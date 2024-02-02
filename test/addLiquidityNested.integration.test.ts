// pnpm test -- addLiquidityNested.integration.test.ts
import { describe, expect, test, beforeAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import {
    Client,
    createTestClient,
    http,
    parseUnits,
    publicActions,
    PublicActions,
    TestActions,
    TransactionReceipt,
    WalletActions,
    walletActions,
} from 'viem';

import {
    Slippage,
    AddLiquidityNested,
    replaceWrapped,
    TokenAmount,
    NestedPoolState,
} from '../src/entities';
import { Address, Hex } from '../src/types';

import { BALANCER_RELAYER, CHAINS, ChainId } from '../src/utils';

import { forkSetup, sendTransactionGetBalances } from './lib/utils/helper';
import { Relayer } from '../src/entities/relayer';
import { AddLiquidityNestedInput } from '../src/entities/addLiquidityNested/types';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { POOLS, TestToken, TOKENS } from './lib/utils/addresses';

type TxInput = {
    poolId: Hex;
    amountsIn: {
        address: Address; // DAI
        rawAmount: bigint;
    }[];
    chainId: ChainId;
    rpcUrl: string;
    testAddress: Address;
    client: Client & PublicActions & TestActions & WalletActions;
    useNativeAssetAsWrappedAmountIn?: boolean;
};

const chainId = ChainId.MAINNET;
const DAI = TOKENS[chainId].DAI;
const WETH = TOKENS[chainId].WETH;
const USDC = TOKENS[chainId].USDC;
const USDT = TOKENS[chainId].USDT;
const BPT_3POOL = POOLS[chainId].BPT_3POOL;
const BPT_WETH_3POOL = POOLS[chainId].BPT_WETH_3POOL;

describe('add liquidity nested test', () => {
    let rpcUrl: string;
    let client: Client & PublicActions & TestActions & WalletActions;
    let poolId: Hex;
    let testAddress: Address;
    let mainTokens: TestToken[];
    let initialBalances: bigint[];

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

        mainTokens = [WETH, DAI, USDC, USDT];
        initialBalances = mainTokens.map((t) => parseUnits('1000', t.decimals));
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
            },
        ];

        const {
            transactionReceipt,
            balanceDeltas,
            bptOut,
            minBptOut,
            slippage,
            value,
        } = await doTransaction({
            poolId,
            amountsIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
        });

        assertResults(
            transactionReceipt,
            bptOut,
            amountsIn,
            balanceDeltas,
            slippage,
            minBptOut,
            value,
        );
    });

    test('all tokens', async () => {
        const amountsIn = mainTokens.map((t) => ({
            address: t.address,
            rawAmount: parseUnits('1', t.decimals),
        }));

        const {
            transactionReceipt,
            balanceDeltas,
            bptOut,
            minBptOut,
            slippage,
            value,
        } = await doTransaction({
            poolId,
            amountsIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
        });

        assertResults(
            transactionReceipt,
            bptOut,
            amountsIn,
            balanceDeltas,
            slippage,
            minBptOut,
            value,
        );
    });

    test('native asset', async () => {
        const amountsIn = mainTokens.map((t) => ({
            address: t.address,
            rawAmount: parseUnits('1', t.decimals),
        }));

        const useNativeAssetAsWrappedAmountIn = true;

        const {
            transactionReceipt,
            balanceDeltas,
            bptOut,
            minBptOut,
            slippage,
            value,
        } = await doTransaction({
            poolId,
            amountsIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
            useNativeAssetAsWrappedAmountIn,
        });

        assertResults(
            transactionReceipt,
            bptOut,
            amountsIn,
            balanceDeltas,
            slippage,
            minBptOut,
            value,
            useNativeAssetAsWrappedAmountIn,
        );
    });

    test('native asset - invalid input', async () => {
        const amountsIn = [
            {
                address: USDC.address,
                rawAmount: parseUnits('1', USDC.decimals),
            },
        ];

        const useNativeAssetAsWrappedAmountIn = true;

        await expect(() =>
            doTransaction({
                poolId,
                amountsIn,
                chainId,
                rpcUrl,
                testAddress,
                client,
                useNativeAssetAsWrappedAmountIn,
            }),
        ).rejects.toThrowError(
            'Adding liquidity with native asset requires wrapped native asset to exist within amountsIn',
        );
    });
});

export const doTransaction = async ({
    poolId,
    amountsIn,
    chainId,
    rpcUrl,
    testAddress,
    client,
    useNativeAssetAsWrappedAmountIn = false,
}: TxInput) => {
    // setup mock api
    const api = new MockApi();
    // get pool state from api
    const nestedPoolFromApi = await api.getNestedPool(poolId);
    // setup add liquidity helper
    const addLiquidityNested = new AddLiquidityNested();

    const addLiquidityInput: AddLiquidityNestedInput = {
        amountsIn,
        chainId,
        rpcUrl,
        accountAddress: testAddress,
        useNativeAssetAsWrappedAmountIn,
    };
    const queryOutput = await addLiquidityNested.query(
        addLiquidityInput,
        nestedPoolFromApi,
    );

    // build add liquidity call with expected minBpOut based on slippage
    const slippage = Slippage.fromPercentage('1'); // 1%

    const signature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        testAddress,
        client,
    );

    const { call, to, value, minBptOut } = addLiquidityNested.buildCall({
        ...queryOutput,
        slippage,
        sender: testAddress,
        recipient: testAddress,
        relayerApprovalSignature: signature,
    });

    let tokensIn = queryOutput.amountsIn.map((a) => a.token);
    if (useNativeAssetAsWrappedAmountIn) {
        tokensIn = replaceWrapped(tokensIn, chainId);
    }

    // send add liquidity transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                ...tokensIn.map((t) => t.address),
                queryOutput.bptOut.token.address,
            ],
            client,
            testAddress,
            to,
            call,
            value,
        );
    return {
        transactionReceipt,
        balanceDeltas,
        bptOut: queryOutput.bptOut,
        minBptOut,
        slippage,
        value,
    };
};

const assertResults = (
    transactionReceipt: TransactionReceipt,
    bptOut: TokenAmount,
    amountsIn: {
        address: Address;
        rawAmount: bigint;
    }[],
    balanceDeltas: bigint[],
    slippage: Slippage,
    minBptOut: bigint,
    value?: bigint,
    useNativeAssetAsWrappedAmountIn = false,
) => {
    expect(transactionReceipt.status).to.eq('success');
    expect(bptOut.amount > 0n).to.be.true;
    const expectedDeltas = [
        ...amountsIn.map((a) => a.rawAmount),
        bptOut.amount,
    ];
    expect(expectedDeltas).to.deep.eq(balanceDeltas);
    const expectedMinBpt = slippage.applyTo(bptOut.amount, -1);
    expect(expectedMinBpt).to.deep.eq(minBptOut);

    const weth = amountsIn.find(
        (a) => a.address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    );
    if (weth && useNativeAssetAsWrappedAmountIn) {
        expect(value).to.eq(weth.rawAmount);
    } else {
        expect(value).to.eq(undefined || 0n);
    }
};

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getNestedPool(poolId: Hex): Promise<NestedPoolState> {
        if (poolId !== BPT_WETH_3POOL.id) throw Error();
        return {
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
