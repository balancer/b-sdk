import dotenv from 'dotenv';
dotenv.config();

import { BalancerApi } from "../../src/data/providers/balancer-api";
import {
  ChainId,
  CHAINS, ExitKind, PoolExit, PoolStateInput,
  SingleAssetExitInput,
  Slippage,
  Token,
  TokenAmount,
} from "../../src";
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
import { forkSetup, sendTransactionGetBalances } from "../../test/lib/utils/helper";

const balancerApiUrl = 'https://backend-v3-canary.beets-ftm-node.com/graphql';
const poolId = '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'; // 80BAL-20WETH
const chainId = ChainId.MAINNET;
const rpcUrl = 'http://127.0.0.1:8545/';
const blockNumber = BigInt(18043296);
const testAddress = '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f'; // Balancer DAO Multisig
const slippage = Slippage.fromPercentage('1'); // 1%

const exit = async () => {
  const balancerApi = new BalancerApi(balancerApiUrl, 1);
  const poolState: PoolStateInput = await balancerApi.pools.fetchPoolState(poolId);
  let client: Client & PublicActions & TestActions & WalletActions;
  let bpt: Token;
  // setup BPT token
  bpt = new Token(chainId, poolState.address, 18, 'BPT');
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
    [poolState.address],
    [0], 
    [
      parseUnits('100', 18),
    ],
    process.env.ETHEREUM_RPC_URL as string,
    blockNumber,
  );

  const bptIn = TokenAmount.fromHumanAmount(bpt, '1');
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

  const { call, to, value, maxBptIn, minAmountsOut } =
    poolExit.buildCall({
      ...queryResult,
      slippage,
      sender: testAddress,
      recipient: testAddress,
    });
  const { transactionReceipt, balanceDeltas } =
    await sendTransactionGetBalances(
      [...poolState.tokens.map(({address})=>address), bpt.address],
      client,
      testAddress,
      to,
      call,
      value,
    );
  console.log("transaction status: " + transactionReceipt.status);
  console.log("token amounts deltas per token: " + balanceDeltas);
}

exit();