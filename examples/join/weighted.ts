import { config } from 'dotenv';
config();

import {
    BalancerApi,
    ChainId,
    CHAINS,
    JoinKind,
    PoolJoin,
    PoolStateInput,
    Slippage,
    Token,
    TokenAmount,
    UnbalancedJoinInput,
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
import { ANVIL_NETWORKS, startFork } from '../../test/anvil/anvil-global-setup';

const balancerApiUrl = 'https://backend-v3-canary.beets-ftm-node.com/graphql';
const poolId =
    '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH
const chainId = ChainId.MAINNET;
const testAddress = '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f'; // Balancer DAO Multisig
const slippage = Slippage.fromPercentage('1'); // 1%

const join = async () => {
    const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
    const balancerApi = new BalancerApi(balancerApiUrl, 1);
    const poolState: PoolStateInput = await balancerApi.pools.fetchPoolState(
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

    await forkSetup(
        client,
        testAddress,
        [...poolState.tokens.map((t) => t.address), poolState.address],
        [1, 3, 0],
        [
            ...poolState.tokens.map((t) => parseUnits('100', t.decimals)),
            parseUnits('100', 18),
        ],
    );

    const poolJoin = new PoolJoin();
    const poolTokens = poolState.tokens.map(
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

    const queryResult = await poolJoin.query(joinInput, poolState);

    const { call, to, value } = poolJoin.buildCall({
        ...queryResult,
        slippage,
        sender: testAddress,
        recipient: testAddress,
    });
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                ...poolState.tokens.map(({ address }) => address),
                poolState.address /*BPT*/,
            ],
            client,
            testAddress,
            to,
            call,
            value,
        );
    console.log(`transaction status: ${transactionReceipt.status}`);
    console.log(`token amounts deltas per token: ${balanceDeltas}`);
    return;
};

join().then(() => {});
