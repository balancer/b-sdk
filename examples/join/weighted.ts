import dotenv from 'dotenv';
dotenv.config();

import { BalancerApi } from "../../src/data/providers/balancer-api";
import { ChainId, CHAINS, JoinKind, Slippage, Token, TokenAmount, UnbalancedJoinInput } from "../../src";
import {
  Client,
  createTestClient,
  http,
  parseUnits,
  PublicActions,
  publicActions,
  TestActions, WalletActions,
  walletActions
} from "viem";
import { PoolState } from "../../src/data/providers/balancer-api/modules/pool-state/types";
import { forkSetup, sendTransactionGetBalances } from "../../test/lib/utils/helper";
import { JoinParser } from "../../src/entities/join/parser";

const balancerApiUrl = 'https://backend-v3-canary.beets-ftm-node.com/graphql';
const poolId = '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH
const chainId = ChainId.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545/';
const blockNumber = BigInt(18043296);
const testAddress = '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f'; // Balancer DAO Multisig
const slippage = Slippage.fromPercentage('1'); // 1%

const join = async () => {
  const balancerApi = new BalancerApi(balancerApiUrl, 1);
  const poolState: PoolState = await balancerApi.pools.fetchPoolState(poolId);
  let client: Client & PublicActions & TestActions & WalletActions;
  client  = createTestClient({
    mode: 'hardhat',
    chain: CHAINS[chainId],
    transport: http(rpcUrl),
  })
    .extend(publicActions)
    .extend(walletActions);

  await forkSetup(
    client,
    testAddress,
    [...poolState.tokens.map((t) => t.address), poolState.address],
    undefined, // TODO: hardcode these values to improve test performance
    [
      ...poolState.tokens.map((t) => parseUnits('100', t.decimals)),
      parseUnits('100', 18),
    ],
    process.env.ETHEREUM_RPC_URL as string,
    blockNumber,
  );


  const joinParser = new JoinParser();
  const weightedJoin = joinParser.getJoin(poolState.type);

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

  const queryResult = await weightedJoin.query(joinInput, poolState);

  const { call, to, value, maxAmountsIn, minBptOut } =
    weightedJoin.buildCall({
      ...queryResult,
      slippage,
      sender: testAddress,
      recipient: testAddress,
    });
  const { transactionReceipt, balanceDeltas } =
    await sendTransactionGetBalances(
      [...poolState.tokens.map(({address})=>address), poolState.address /*BPT*/],
      client,
      testAddress,
      to,
      call,
      value,
    );
  console.log(transactionReceipt);
  console.log(balanceDeltas);
}

join();