// pnpm test -- addLiquidityNestedPolygon.integration.test.ts
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
import { TestToken, TOKENS } from './lib/utils/addresses';

type TxInput = {
    poolId: Hex;
    amountsIn: {
        address: Address;
        rawAmount: bigint;
    }[];
    chainId: ChainId;
    rpcUrl: string;
    testAddress: Address;
    client: Client & PublicActions & TestActions & WalletActions;
    useNativeAssetAsWrappedAmountIn?: boolean;
};

const chainId = ChainId.POLYGON;
const DAO_st_WMATIC_POOL_ID =
    '0x60f46b189736c0d2ae52a79382b64c1e2a86b0d9000200000000000000000cc4' as const;
const WMATIC = TOKENS[chainId].WMATIC;

describe('add liquidity nested test', () => {
    let rpcUrl: string;
    let client: Client & PublicActions & TestActions & WalletActions;
    let poolId: Hex;
    let testAddress: Address;
    let mainTokens: TestToken[];
    let initialBalances: bigint[];

    beforeAll(async () => {
        // setup chain and test client
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.POLYGON,
            undefined,
            53550841n,
        ));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        poolId = DAO_st_WMATIC_POOL_ID;

        mainTokens = [WMATIC];
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
                address: WMATIC.address,
                rawAmount: parseUnits('1', WMATIC.decimals),
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
        if (poolId !== DAO_st_WMATIC_POOL_ID) throw Error();
        return {
            pools: [
                {
                    id: '0x60f46b189736c0d2ae52a79382b64c1e2a86b0d9000200000000000000000cc4',
                    address: '0x60f46b189736c0d2ae52a79382b64c1e2a86b0d9',
                    type: PoolType.Weighted,
                    level: 1,
                    tokens: [
                        {
                            address:
                                '0x17840df7caa07e298b16e8612157b90ed231c973',
                            decimals: 18,
                            index: 0,
                        },
                        {
                            address:
                                '0x8159462d255c1d24915cb51ec361f700174cd994',
                            decimals: 18,
                            index: 1,
                        },
                    ],
                },
                {
                    id: '0x8159462d255c1d24915cb51ec361f700174cd99400000000000000000000075d',
                    address: '0x8159462d255c1d24915cb51ec361f700174cd994',
                    level: 0,
                    type: PoolType.ComposableStable,
                    tokens: [
                        {
                            address:
                                '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
                            decimals: 18,
                            index: 0,
                        },
                        {
                            address:
                                '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
                            decimals: 18,
                            index: 1,
                        },
                        {
                            address:
                                '0x8159462d255c1d24915cb51ec361f700174cd994',
                            decimals: 18,
                            index: 2,
                        },
                    ],
                },
            ],
            mainTokens: [
                {
                    address: '0x17840df7caa07e298b16e8612157b90ed231c973',
                    decimals: 18,
                },
                {
                    address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
                    decimals: 18,
                },
                {
                    address: '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
                    decimals: 18,
                },
            ],
        };
    }
}
