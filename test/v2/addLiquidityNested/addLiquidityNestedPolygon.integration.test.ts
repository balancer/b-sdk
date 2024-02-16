// pnpm test -- addLiquidityNestedPolygon.integration.test.ts
import { describe, test, beforeAll } from 'vitest';
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
    WalletActions,
    walletActions,
} from 'viem';

import { NestedPoolState } from '@/entities';
import { Address, Hex, PoolType } from '@/types';
import { CHAINS, ChainId } from '@/utils';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { POOLS, TestToken, TOKENS } from 'test/lib/utils/addresses';
import {
    assertResults,
    doAddLiquidityNested,
} from 'test/lib/utils/addLiquidityNestedHelper';
import { forkSetup } from 'test/lib/utils/helper';
import { AddLiquidityNestedTxInput } from 'test/lib/utils/types';

const chainId = ChainId.POLYGON;
const WMATIC = TOKENS[chainId].WMATIC;
const DAO_st_WMATIC = POOLS[chainId].DAO_st_WMATIC;

describe('add liquidity nested test', () => {
    let rpcUrl: string;
    let client: Client & PublicActions & TestActions & WalletActions;
    let testAddress: Address;
    let mainTokens: TestToken[];
    let initialBalances: bigint[];
    let txInput: AddLiquidityNestedTxInput;

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

        // setup mock api
        const api = new MockApi();
        // get pool state from api
        const nestedPoolState = await api.getNestedPool(DAO_st_WMATIC.id);

        mainTokens = [WMATIC];
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
                address: WMATIC.address,
                rawAmount: parseUnits('1', WMATIC.decimals),
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
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getNestedPool(poolId: Hex): Promise<NestedPoolState> {
        if (poolId !== DAO_st_WMATIC.id) throw Error();
        return {
            pools: [
                {
                    id: DAO_st_WMATIC.id,
                    address: DAO_st_WMATIC.address,
                    type: DAO_st_WMATIC.type,
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
