// pnpm test -- weightedJoin.integration.test.ts
import { describe, expect, test, beforeAll, beforeEach } from 'vitest';
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

import {
    BaseJoin,
    UnbalancedJoinInput,
    ProportionalJoinInput,
    SingleAssetJoinInput,
    JoinKind,
    Slippage,
    Token,
    TokenAmount,
    replaceWrapped,
} from '../src/entities';
import { JoinParser } from '../src/entities/join/parser';
import { Address, Hex } from '../src/types';
import { PoolState } from '../src/entities/types';
import { CHAINS, ChainId, getPoolAddress } from '../src/utils';

import { forkSetup, sendTransactionGetBalances } from './lib/utils/helper';

const chainId = ChainId.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545/';
const blockNumber = 18043296n;
const testAddress = '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f'; // Balancer DAO Multisig
const slippage = Slippage.fromPercentage('1'); // 1%
const poolId =
    '0x68e3266c9c8bbd44ad9dca5afbfe629022aee9fe000200000000000000000512'; // Balancer 50COMP-50wstETH

describe('weighted pool-state test', () => {
    let api: MockApi;
    let client: Client & PublicActions & TestActions & WalletActions;
    let poolFromApi: PoolState;
    let weightedJoin: BaseJoin;
    let bpt: Token;

    beforeAll(async () => {
        // setup mock api
        api = new MockApi();

        client = createTestClient({
            mode: 'hardhat',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        // get pool state from api
        poolFromApi = await api.getPool(poolId);

        // setup pool-state helper
        const joinParser = new JoinParser();
        weightedJoin = joinParser.getJoin(poolFromApi.type);

        // setup BPT token
        bpt = new Token(chainId, poolFromApi.address, 18, 'BPT');
    });

    beforeEach(async () => {
        await forkSetup(
            client,
            testAddress,
            [...poolFromApi.tokens.map((t) => t.address), poolFromApi.address],
            undefined, // TODO: hardcode these values to improve test performance
            [
                ...poolFromApi.tokens.map((t) => parseUnits('100', t.decimals)),
                parseUnits('100', 18),
            ],
            process.env.ETHEREUM_RPC_URL as string,
            blockNumber,
        );
    });

    test('unbalanced pool-state', async () => {
        const poolTokens = poolFromApi.tokens.map(
            (t) => new Token(chainId, t.address, t.decimals),
        );
        const amountsIn = poolTokens.map((t) =>
            TokenAmount.fromHumanAmount(t, '1'),
        );

        // perform pool-state query to get expected bpt out
        const joinInput: UnbalancedJoinInput = {
            amountsIn,
            chainId,
            rpcUrl,
            kind: JoinKind.Unbalanced,
        };

        const { queryResult, maxAmountsIn, minBptOut, value } =
            await doTransaction(
                joinInput,
                poolFromApi.tokens.map((t) => t.address),
                bpt.address,
                slippage,
            );

        // Query should use same amountsIn as user sets
        expect(queryResult.amountsIn).to.deep.eq(amountsIn);
        expect(queryResult.tokenInIndex).to.be.undefined;

        // Should be no native value
        expect(value).toBeUndefined;

        // Expect some bpt amount
        expect(queryResult.bptOut.amount > 0n).to.be.true;

        // Confirm slippage - only bpt out
        const expectedMinBpt = slippage.removeFrom(queryResult.bptOut.amount);
        expect(expectedMinBpt).to.deep.eq(minBptOut);
        const expectedMaxAmountsIn = amountsIn.map((a) => a.amount);
        expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn);
    });

    test('native asset pool-state', async () => {
        const poolTokens = poolFromApi.tokens.map(
            (t) => new Token(chainId, t.address, t.decimals),
        );
        const amountsIn = poolTokens.map((t) =>
            TokenAmount.fromHumanAmount(t, '1'),
        );

        // perform pool-state query to get expected bpt out
        const joinInput: UnbalancedJoinInput = {
            amountsIn,
            chainId,
            rpcUrl,
            kind: JoinKind.Unbalanced,
            useNativeAssetAsWrappedAmountIn: true,
        };

        // We have to use zero address for balanceDeltas
        const { queryResult, maxAmountsIn, minBptOut, value } =
            await doTransaction(
                joinInput,
                replaceWrapped(poolTokens, chainId).map((a) => a.address),
                bpt.address,
                slippage,
            );

        // Query should use same amountsIn as user sets
        expect(queryResult.amountsIn.map((a) => a.amount)).to.deep.eq(
            amountsIn.map((a) => a.amount),
        );
        expect(queryResult.tokenInIndex).to.be.undefined;
        // Should have native value equal to input amount
        expect(value).eq(amountsIn[0].amount);

        // Expect some bpt amount
        expect(queryResult.bptOut.amount > 0n).to.be.true;

        // Confirm slippage - only bpt out
        const expectedMinBpt = slippage.removeFrom(queryResult.bptOut.amount);
        expect(expectedMinBpt).to.deep.eq(minBptOut);
        const expectedMaxAmountsIn = amountsIn.map((a) => a.amount);
        expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn);
    });

    test('single asset pool-state', async () => {
        const bptOut = TokenAmount.fromHumanAmount(bpt, '1');
        const tokenIn = '0x198d7387fa97a73f05b8578cdeff8f2a1f34cd1f';

        // perform pool-state query to get expected bpt out
        const joinInput: SingleAssetJoinInput = {
            bptOut,
            tokenIn,
            chainId,
            rpcUrl,
            kind: JoinKind.SingleAsset,
        };

        const { queryResult, maxAmountsIn, minBptOut, value } =
            await doTransaction(
                joinInput,
                poolFromApi.tokens.map((t) => t.address),
                bpt.address,
                slippage,
            );

        // Query should use same bpt out as user sets
        expect(queryResult.bptOut.amount).to.deep.eq(bptOut.amount);

        // We only expect single asset to have a value for amount in
        expect(queryResult.tokenInIndex).toBeDefined;
        queryResult.amountsIn.forEach((a, i) => {
            if (i === queryResult.tokenInIndex)
                expect(a.amount > 0n).to.be.true;
            else expect(a.amount === 0n).to.be.true;
        });

        // Should be no native value
        expect(value).toBeUndefined;

        // Confirm slippage - only to amount in not bpt out
        const expectedMaxAmountsIn = queryResult.amountsIn.map((a) =>
            slippage.applyTo(a.amount),
        );
        expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn);
        expect(minBptOut).to.eq(bptOut.amount);
    });

    test('proportional pool-state', async () => {
        const bptOut = TokenAmount.fromHumanAmount(bpt, '1');

        // perform pool-state query to get expected bpt out
        const joinInput: ProportionalJoinInput = {
            bptOut,
            chainId,
            rpcUrl,
            kind: JoinKind.Proportional,
        };

        const { queryResult, maxAmountsIn, minBptOut, value } =
            await doTransaction(
                joinInput,
                poolFromApi.tokens.map((t) => t.address),
                bpt.address,
                slippage,
            );

        // Query should use same bpt out as user sets
        expect(queryResult.bptOut.amount).to.deep.eq(bptOut.amount);

        // Expect all assets to have a value for amount in
        expect(queryResult.tokenInIndex).toBeDefined;
        queryResult.amountsIn.forEach((a) => {
            expect(a.amount > 0n).to.be.true;
        });
        expect(queryResult.tokenInIndex).toBeUndefined;

        // Should be no native value
        expect(value).toBeUndefined;

        // Confirm slippage - only to amount in not bpt out
        const expectedMaxAmountsIn = queryResult.amountsIn.map((a) =>
            slippage.applyTo(a.amount),
        );
        expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn);
        expect(minBptOut).to.eq(bptOut.amount);
    });

    async function doTransaction(
        joinInput:
            | UnbalancedJoinInput
            | ProportionalJoinInput
            | SingleAssetJoinInput,
        poolTokens: Address[],
        bptToken: Address,
        slippage: Slippage,
    ) {
        const queryResult = await weightedJoin.query(joinInput, poolFromApi);

        const { call, to, value, maxAmountsIn, minBptOut } =
            weightedJoin.buildCall({
                ...queryResult,
                slippage,
                sender: testAddress,
                recipient: testAddress,
            });

        // send transaction and check balance changes
        const { transactionReceipt, balanceDeltas } =
            await sendTransactionGetBalances(
                [...poolTokens, bptToken],
                client,
                testAddress,
                to,
                call,
                value,
            );
        expect(transactionReceipt.status).to.eq('success');

        // Confirm final balance changes match query result
        const expectedDeltas = [
            ...queryResult.amountsIn.map((a) => a.amount),
            queryResult.bptOut.amount,
        ];
        expect(expectedDeltas).to.deep.eq(balanceDeltas);

        return {
            queryResult,
            maxAmountsIn,
            minBptOut,
            value,
        };
    }
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address:
                    '0x198d7387fa97a73f05b8578cdeff8f2a1f34cd1f' as Address, // wjAURA
                decimals: 18,
                index: 0,
            },
            {
                address:
                    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
                decimals: 18,
                index: 1,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'Weighted',
            tokens,
        };
    }
}

/******************************************************************************/
