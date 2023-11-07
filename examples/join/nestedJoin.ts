// pnpm example ./examples/join/nestedJoin.ts
import { config } from 'dotenv';
config();

import {
    Address,
    BALANCER_RELAYER,
    BalancerApi,
    ChainId,
    CHAINS,
    NestedJoin,
    NestedPoolState,
    replaceWrapped,
    Slippage,
} from '../../src';
import {
    Client,
    createTestClient,
    http,
    parseUnits,
    PublicActions,
    publicActions,
    TestActions,
    WalletActions,
    walletActions,
} from 'viem';
import {
    forkSetup,
    sendTransactionGetBalances,
} from '../../test/lib/utils/helper';
import anvilGlobalSetup from '../../test/anvil/anvil-global-setup';
import { NestedJoinInput } from '../../src/entities/nestedJoin/types';
import { Relayer } from '../../src/entities/relayer';

const balancerApiUrl = 'https://backend-v3-canary.beets-ftm-node.com/graphql';
const poolId =
    '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0'; // WETH-3POOL
const chainId = ChainId.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545/';

/**
 * FIXME: the example will work properly only once we release relayer v6
 * containing relayer queries - at that moment, we should update blockNumber on
 * global anvil setup to after the relayer release
 */
const nestedJoin = async () => {
    // User approve vault to spend their tokens and update user balance
    const { client, accountAddress, nestedPoolState } = await exampleSetup();

    // setup join helper
    const nestedJoin = new NestedJoin();

    const amountsIn = [
        {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f' as Address, // DAI
            rawAmount: parseUnits('1', 18),
        },
    ];

    const useNativeAssetAsWrappedAmountIn = false;

    const joinInput: NestedJoinInput = {
        amountsIn,
        chainId,
        rpcUrl,
        accountAddress,
        useNativeAssetAsWrappedAmountIn,
    };
    const queryResult = await nestedJoin.query(joinInput, nestedPoolState);

    // build join call with expected minBpOut based on slippage
    const slippage = Slippage.fromPercentage('1'); // 1%

    const signature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        accountAddress,
        client,
    );

    const { call, to, value } = nestedJoin.buildCall({
        ...queryResult,
        slippage,
        sender: accountAddress,
        recipient: accountAddress,
        relayerApprovalSignature: signature,
    });

    let tokensIn = queryResult.amountsIn.map((a) => a.token);
    if (useNativeAssetAsWrappedAmountIn) {
        tokensIn = replaceWrapped(tokensIn, chainId);
    }

    const tokens = [
        ...tokensIn.map((t) => t.address),
        queryResult.bptOut.token.address,
    ];

    // send join transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            tokens,
            client,
            accountAddress,
            to,
            call,
            value,
        );
    console.log(`transaction status: ${transactionReceipt.status}`);
    console.table({
        tokens,
        balanceDeltas,
    });
};

const exampleSetup = async (): Promise<{
    client: Client & PublicActions & TestActions & WalletActions;
    accountAddress: Address;
    nestedPoolState: NestedPoolState;
}> => {
    await anvilGlobalSetup();
    const balancerApi = new BalancerApi(balancerApiUrl, 1);
    const nestedPoolState = await balancerApi.nestedPools.fetchNestedPoolState(
        poolId,
    );

    const client: Client & PublicActions & TestActions & WalletActions =
        createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

    const accountAddress = (await client.getAddresses())[0];

    const mainTokens = [
        {
            address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address,
            balance: parseUnits('1000', 18),
            slot: 3,
        },
        {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f' as Address,
            balance: parseUnits('1000', 18),
            slot: 2,
        },
        {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Address,
            balance: parseUnits('1000', 6),
            slot: 9,
        },
        {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7' as Address,
            balance: parseUnits('1000', 6),
            slot: 2,
        },
    ];

    await forkSetup(
        client,
        accountAddress,
        mainTokens.map((t) => t.address),
        mainTokens.map((t) => t.slot),
        mainTokens.map((t) => t.balance),
    );

    return {
        client,
        accountAddress,
        nestedPoolState,
    };
};

nestedJoin().then(() => {});
