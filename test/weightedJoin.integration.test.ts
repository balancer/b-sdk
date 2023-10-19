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
    UnbalancedJoinInput,
    ProportionalJoinInput,
    SingleAssetJoinInput,
    JoinKind,
    Slippage,
    Token,
    TokenAmount,
    replaceWrapped,
    Address,
    Hex,
    PoolStateInput,
    CHAINS,
    ChainId,
    getPoolAddress,
    PoolJoin,
    JoinInput,
} from '../src';
import { forkSetup, sendTransactionGetBalances } from './lib/utils/helper';

type TxInput = {
    client: Client & PublicActions & TestActions & WalletActions;
    poolJoin: PoolJoin;
    joinInput: JoinInput;
    slippage: Slippage;
    poolInput: PoolStateInput;
    testAddress: Address;
    checkNativeBalance: boolean;
};

const chainId = ChainId.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545/';
const poolId =
    '0x68e3266c9c8bbd44ad9dca5afbfe629022aee9fe000200000000000000000512'; // Balancer 50COMP-50wstETH

describe('weighted join test', () => {
    let txInput: TxInput;
    let bptToken: Token;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        const poolInput = await api.getPool(poolId);

        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        txInput = {
            client,
            poolJoin: new PoolJoin(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolInput,
            testAddress: '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f', // Balancer DAO Multisig
            joinInput: {} as JoinInput,
            checkNativeBalance: false,
        };

        // setup BPT token
        bptToken = new Token(chainId, poolInput.address, 18, 'BPT');
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [
                ...txInput.poolInput.tokens.map((t) => t.address),
                txInput.poolInput.address,
            ],
            undefined, // TODO: hardcode these values to improve test performance
            [
                ...txInput.poolInput.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
                parseUnits('100', 18),
            ],
        );
    });

    test('unbalanced join', async () => {
        const poolTokens = txInput.poolInput.tokens.map(
            (t) => new Token(chainId, t.address, t.decimals),
        );
        const amountsIn = poolTokens.map((t) =>
            TokenAmount.fromHumanAmount(t, '1'),
        );

        // perform join query to get expected bpt out
        const joinInput: UnbalancedJoinInput = {
            amountsIn,
            chainId,
            rpcUrl,
            kind: JoinKind.Unbalanced,
        };

        const { queryResult, maxAmountsIn, minBptOut, value } =
            await doTransaction({
                ...txInput,
                joinInput,
            });

        // Query should use same amountsIn as user sets
        expect(queryResult.amountsIn).to.deep.eq(amountsIn);
        expect(queryResult.tokenInIndex).to.be.undefined;

        // Should be no native value
        expect(value).toBeUndefined;

        // Expect some bpt amount
        expect(queryResult.bptOut.amount > 0n).to.be.true;

        // Confirm slippage - only bpt out
        const expectedMinBpt = txInput.slippage.removeFrom(
            queryResult.bptOut.amount,
        );
        expect(expectedMinBpt).to.deep.eq(minBptOut);
        const expectedMaxAmountsIn = amountsIn.map((a) => a.amount);
        expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn);
    });

    test('native asset join', async () => {
        const poolTokens = txInput.poolInput.tokens.map(
            (t) => new Token(chainId, t.address, t.decimals),
        );
        const amountsIn = poolTokens.map((t) =>
            TokenAmount.fromHumanAmount(t, '1'),
        );

        // perform join query to get expected bpt out
        const joinInput: UnbalancedJoinInput = {
            amountsIn,
            chainId,
            rpcUrl,
            kind: JoinKind.Unbalanced,
            useNativeAssetAsWrappedAmountIn: true,
        };

        // We have to use zero address for balanceDeltas
        const { queryResult, maxAmountsIn, minBptOut, value } =
            await doTransaction({
                ...txInput,
                joinInput,
                checkNativeBalance: true,
            });

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
        const expectedMinBpt = txInput.slippage.removeFrom(
            queryResult.bptOut.amount,
        );
        expect(expectedMinBpt).to.deep.eq(minBptOut);
        const expectedMaxAmountsIn = amountsIn.map((a) => a.amount);
        expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn);
    });

    test('single asset join', async () => {
        const bptOut = TokenAmount.fromHumanAmount(bptToken, '1');
        const tokenIn = '0x198d7387fa97a73f05b8578cdeff8f2a1f34cd1f';

        // perform join query to get expected bpt out
        const joinInput: SingleAssetJoinInput = {
            bptOut,
            tokenIn,
            chainId,
            rpcUrl,
            kind: JoinKind.SingleAsset,
        };

        const { queryResult, maxAmountsIn, minBptOut, value } =
            await doTransaction({
                ...txInput,
                joinInput,
            });

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
            txInput.slippage.applyTo(a.amount),
        );
        expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn);
        expect(minBptOut).to.eq(bptOut.amount);
    });

    test('proportional join', async () => {
        const bptOut = TokenAmount.fromHumanAmount(bptToken, '1');

        // perform join query to get expected bpt out
        const joinInput: ProportionalJoinInput = {
            bptOut,
            chainId,
            rpcUrl,
            kind: JoinKind.Proportional,
        };

        const { queryResult, maxAmountsIn, minBptOut, value } =
            await doTransaction({
                ...txInput,
                joinInput,
            });

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
            txInput.slippage.applyTo(a.amount),
        );
        expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn);
        expect(minBptOut).to.eq(bptOut.amount);
    });

    async function doTransaction(txIp: TxInput) {
        const {
            poolJoin,
            poolInput,
            joinInput,
            testAddress,
            client,
            slippage,
            checkNativeBalance,
        } = txIp;
        const queryResult = await poolJoin.query(joinInput, poolInput);

        const { call, to, value, maxAmountsIn, minBptOut } = poolJoin.buildCall(
            {
                ...queryResult,
                slippage,
                sender: testAddress,
                recipient: testAddress,
            },
        );

        const poolTokens = poolInput.tokens.map(
            (t) => new Token(chainId, t.address, t.decimals),
        );

        // Replace with native asset if required
        const poolTokensAddr = checkNativeBalance
            ? replaceWrapped(poolTokens, chainId).map((t) => t.address)
            : poolTokens.map((t) => t.address);

        // send transaction and check balance changes
        const { transactionReceipt, balanceDeltas } =
            await sendTransactionGetBalances(
                [...poolTokensAddr, poolInput.address],
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
    public async getPool(id: Hex): Promise<PoolStateInput> {
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
