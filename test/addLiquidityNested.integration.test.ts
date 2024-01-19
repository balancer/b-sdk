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
import { Address, Hex, PoolType } from '../src/types';

import { BALANCER_RELAYER, CHAINS, ChainId } from '../src/utils';

import { forkSetup, sendTransactionGetBalances } from './lib/utils/helper';
import { Relayer } from '../src/entities/relayer';
import { AddLiquidityNestedInput } from '../src/entities/addLiquidityNested/types';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { daiAddress, usdcAddress, usdtAddress, wethAddress } from './lib/utils/tokenAddresses';

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

describe('add liquidity nested test', () => {
    let chainId: ChainId;
    let rpcUrl: string;
    let client: Client & PublicActions & TestActions & WalletActions;
    let poolId: Hex;
    let testAddress: Address;
    let mainTokens: {
        address: Address;
        balance: bigint;
        slot: number;
    }[];

    beforeAll(async () => {
        // setup chain and test client
        chainId = ChainId.MAINNET;
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET));

        client = createTestClient({
            mode: 'hardhat',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        poolId =
            '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0'; // WETH-3POOL-BPT

        // User approve vault to spend their tokens and update user balance
        mainTokens = [
            {
                address: wethAddress,
                balance: parseUnits('1000', 18),
                slot: 3,
            },
            {
                address: daiAddress,
                balance: parseUnits('1000', 18),
                slot: 2,
            },
            {
                address: usdcAddress,
                balance: parseUnits('1000', 6),
                slot: 9,
            },
            {
                address: usdtAddress,
                balance: parseUnits('1000', 6),
                slot: 2,
            },
        ];
    });

    beforeEach(async () => {
        await forkSetup(
            client,
            testAddress,
            mainTokens.map((t) => t.address),
            mainTokens.map((t) => t.slot),
            mainTokens.map((t) => t.balance),
        );
    });

    test('single token', async () => {
        const amountsIn = [
            {
                address: daiAddress,
                rawAmount: parseUnits('1', 18),
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

    test('single Token WETH', async () => {
        const amountsIn = [
            {
                address: wethAddress,
                rawAmount: parseUnits('1', 18),
            },
        ];

        const balance = await client.getBalance({address: wethAddress })
        expect(balance).toBeGreaterThan(0n)

        await doTransaction({
            poolId,
            amountsIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
            useNativeAssetAsWrappedAmountIn: false,
        });
    });

    test('all tokens', async () => {
        const amountsIn = [
            {
                address: wethAddress,
                rawAmount: parseUnits('1', 18),
            },
            {
                address: daiAddress,
                rawAmount: parseUnits('1', 18),
            },
            {
                address: usdcAddress,
                rawAmount: parseUnits('1', 6),
            },
            {
                address: usdtAddress,
                rawAmount: parseUnits('1', 6),
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

    test('native asset', async () => {
        const amountsIn = [
            {
                address: wethAddress,
                rawAmount: parseUnits('1', 18),
            },
            {
                address: daiAddress,
                rawAmount: parseUnits('1', 18),
            },
            {
                address: usdcAddress,
                rawAmount: parseUnits('1', 6),
            },
            {
                address: usdtAddress,
                rawAmount: parseUnits('1', 6),
            },
        ];

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
                address: usdcAddress,
                rawAmount: parseUnits('1', 6),
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
    const expectedMinBpt = slippage.removeFrom(bptOut.amount);
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
        if (
            poolId !==
            '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0'
        )
            throw Error();
        return {
            pools: [
                {
                    id: '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0',
                    address: '0x08775ccb6674d6bdceb0797c364c2653ed84f384',
                    type: PoolType.Weighted,
                    level: 1,
                    tokens: [
                        {
                            address:
                                '0x79c58f70905f734641735bc61e45c19dd9ad60bc', // 3POOL-BPT
                            decimals: 18,
                            index: 0,
                        },
                        {
                            address:
                                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                            decimals: 18,
                            index: 1,
                        },
                    ],
                },
                {
                    id: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
                    address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc',
                    type: PoolType.ComposableStable,
                    level: 0,
                    tokens: [
                        {
                            address:
                                '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
                            decimals: 18,
                            index: 0,
                        },
                        {
                            address:
                                '0x79c58f70905f734641735bc61e45c19dd9ad60bc', // 3POOL-BPT
                            decimals: 18,
                            index: 1,
                        },
                        {
                            address:
                                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
                            decimals: 6,
                            index: 2,
                        },
                        {
                            address:
                                '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
                            decimals: 6,
                            index: 3,
                        },
                    ],
                },
            ],
            mainTokens: [
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                    decimals: 18,
                },
                {
                    address: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
                    decimals: 18,
                },
                {
                    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
                    decimals: 6,
                },
                {
                    address: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
                    decimals: 6,
                },
            ],
        };
    }
}
