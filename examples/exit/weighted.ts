// Run with - pnpm example ./examples/exit/weighted.ts
import dotenv from 'dotenv';
dotenv.config();

import { BalancerApi } from '../../src/data/providers/balancer-api';
import {
    ChainId,
    CHAINS,
    ExitKind,
    PoolExit,
    PoolStateInput,
    SingleAssetExitInput,
    Slippage,
    Token,
    InputAmount,
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
    parseEther,
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

const exit = async () => {
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
    const bpt = new Token(chainId, poolState.address, 18, 'BPT');

    await forkSetup(
        client,
        testAddress,
        [poolState.address],
        [0],
        [parseUnits('100', 18)],
    );

    const bptIn: InputAmount = {
        rawAmount: parseEther('1'),
        decimals: 18,
        address: poolState.address,
    };
    const tokenOut = '0xba100000625a3754423978a60c9317c58a424e3D'; // BAL

    const poolExit = new PoolExit();

    const exitInput: SingleAssetExitInput = {
        chainId,
        rpcUrl,
        bptIn,
        tokenOut,
        kind: ExitKind.SINGLE_ASSET,
    };

    const queryResult = await poolExit.query(exitInput, poolState);

    const { call, to, value } = poolExit.buildCall({
        ...queryResult,
        slippage,
        sender: testAddress,
        recipient: testAddress,
    });
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [...poolState.tokens.map(({ address }) => address), bpt.address],
            client,
            testAddress,
            to,
            call,
            value,
        );
    console.log(`transaction status: ${transactionReceipt.status}`);
    console.log(`token amounts deltas per token: ${balanceDeltas}`);
};

exit();
