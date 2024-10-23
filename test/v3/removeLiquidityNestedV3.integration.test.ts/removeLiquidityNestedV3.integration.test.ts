// pnpm test -- removeLiquidityNestedV3.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
    TestActions,
    TransactionReceipt,
    walletActions,
} from 'viem';

import {
    Address,
    BALANCER_RELAYER,
    ChainId,
    CHAINS,
    Hex,
    NestedPoolState,
    PoolType,
    Relayer,
    RemoveLiquidityNestedProportionalInput,
    RemoveLiquidityNestedSingleTokenInput,
    replaceWrapped,
    Slippage,
    TokenAmount,
    PublicWalletClient,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { forkSetup, sendTransactionGetBalances } from 'test/lib/utils';
import { RemoveLiquidityNested } from '@/entities/removeLiquidityNested';

type TxInput = {
    poolId: Hex;
    amountIn: bigint;
    chainId: ChainId;
    rpcUrl: string;
    testAddress: Address;
    client: PublicWalletClient & TestActions;
    tokenOut?: Address;
    wethIsEth?: boolean;
};

describe.skip('remove liquidity nested test', () => {
    let chainId: ChainId;
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let poolId: Hex;
    let testAddress: Address;

    beforeAll(async () => {
        // setup chain and test client
        chainId = ChainId.MAINNET;
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        poolId =
            '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0'; // WETH-3POOL-BPT
    });

    beforeEach(async () => {
        await forkSetup(
            client,
            testAddress,
            ['0x08775ccb6674d6bdceb0797c364c2653ed84f384'],
            [0],
            [parseUnits('1000', 18)],
        );
    });

    test('proportional', async () => {
        const amountIn = parseUnits('1', 18);

        const {
            transactionReceipt,
            expectedDeltas,
            balanceDeltas,
            amountsOut,
            slippage,
            minAmountsOut,
        } = await doTransaction({
            poolId,
            amountIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
        });

        assertResults(
            transactionReceipt,
            expectedDeltas,
            balanceDeltas,
            amountsOut,
            slippage,
            minAmountsOut,
        );
    });

    test('proportional - native asset', async () => {
        const amountIn = parseUnits('1', 18);
        const wethIsEth = true;

        const {
            transactionReceipt,
            expectedDeltas,
            balanceDeltas,
            amountsOut,
            slippage,
            minAmountsOut,
        } = await doTransaction({
            poolId,
            amountIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
            wethIsEth,
        });

        assertResults(
            transactionReceipt,
            expectedDeltas,
            balanceDeltas,
            amountsOut,
            slippage,
            minAmountsOut,
        );
    });

    test('single token - token index > bptIndex', async () => {
        const amountIn = parseUnits('1', 18);
        const tokenOut = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // USDC

        const {
            transactionReceipt,
            expectedDeltas,
            balanceDeltas,
            amountsOut,
            slippage,
            minAmountsOut,
        } = await doTransaction({
            poolId,
            amountIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
            tokenOut,
        });

        assertResults(
            transactionReceipt,
            expectedDeltas,
            balanceDeltas,
            amountsOut,
            slippage,
            minAmountsOut,
        );
    });

    test('single token - native asset', async () => {
        const amountIn = parseUnits('1', 18);
        const tokenOut = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
        const wethIsEth = true;

        const {
            transactionReceipt,
            expectedDeltas,
            balanceDeltas,
            amountsOut,
            slippage,
            minAmountsOut,
        } = await doTransaction({
            poolId,
            amountIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
            tokenOut,
            wethIsEth,
        });

        assertResults(
            transactionReceipt,
            expectedDeltas,
            balanceDeltas,
            amountsOut,
            slippage,
            minAmountsOut,
        );
    });

    test('single token - native asset - invalid input', async () => {
        const amountIn = parseUnits('1', 18);
        const tokenOut = '0x6b175474e89094c44da98b954eedeac495271d0f'; // DAI
        const wethIsEth = true;

        await expect(
            doTransaction({
                poolId,
                amountIn,
                chainId,
                rpcUrl,
                testAddress,
                client,
                tokenOut,
                wethIsEth,
            }),
        ).rejects.toThrow(
            'Removing liquidity to native asset requires wrapped native asset to exist within amounts out',
        );
    });
});

export const doTransaction = async ({
    poolId,
    amountIn,
    chainId,
    rpcUrl,
    testAddress,
    client,
    tokenOut,
    wethIsEth = false,
}: TxInput) => {
    // setup mock api
    const api = new MockApi();
    // get pool state from api
    const nestedPoolFromApi = await api.getNestedPool(poolId);

    // setup remove liquidity helper
    const removeLiquidityNested = new RemoveLiquidityNested();
    const removeLiquidityInput:
        | RemoveLiquidityNestedProportionalInput
        | RemoveLiquidityNestedSingleTokenInput = {
        bptAmountIn: amountIn,
        chainId,
        rpcUrl,
        tokenOut,
    };
    const queryOutput = await removeLiquidityNested.query(
        removeLiquidityInput,
        nestedPoolFromApi,
    );

    // build remove liquidity call with expected minBpOut based on slippage
    const slippage = Slippage.fromPercentage('1'); // 1%

    const signature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        testAddress,
        client,
    );

    const { callData, to, minAmountsOut } = removeLiquidityNested.buildCall({
        ...queryOutput,
        slippage,
        accountAddress: testAddress,
        relayerApprovalSignature: signature,
        wethIsEth,
    });

    let tokensOut = minAmountsOut.map((a) => a.token);
    if (wethIsEth) {
        tokensOut = replaceWrapped(tokensOut, chainId);
    }

    // send remove liquidity transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                queryOutput.bptAmountIn.token.address,
                ...tokensOut.map((t) => t.address),
            ],
            client,
            testAddress,
            to,
            callData,
        );

    const expectedDeltas = [
        queryOutput.bptAmountIn.amount,
        ...queryOutput.amountsOut.map((amountOut) => amountOut.amount),
    ];

    return {
        transactionReceipt,
        expectedDeltas,
        balanceDeltas,
        amountsOut: queryOutput.amountsOut,
        slippage,
        minAmountsOut,
    };
};

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getNestedPool(poolId: Hex): Promise<NestedPoolState> {
        if (
            poolId !==
            '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0'
        )
            throw Error();
        return {
            protocolVersion: 3,
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

function assertResults(
    transactionReceipt: TransactionReceipt,
    expectedDeltas: bigint[],
    balanceDeltas: bigint[],
    amountsOut: TokenAmount[],
    slippage: Slippage,
    minAmountsOut: TokenAmount[],
) {
    expect(transactionReceipt.status).to.eq('success');
    amountsOut.map((amountOut) => expect(amountOut.amount > 0n).to.be.true);
    expect(expectedDeltas).to.deep.eq(balanceDeltas);
    const expectedMinAmountsOut = amountsOut.map((amountOut) =>
        slippage.applyTo(amountOut.amount, -1),
    );
    expect(expectedMinAmountsOut).to.deep.eq(
        minAmountsOut.map((a) => a.amount),
    );
}
/******************************************************************************/
