// pnpm test -- weightedJoin.integration.test.ts
import { describe, expect, test, beforeAll, beforeEach } from 'vitest';
import { config } from 'dotenv';
config();

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
const blockNumber = BigInt(18043296);
const poolId =
  '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76000000000000000000000570'; // Balancer vETH/WETH StablePool

describe('composable stable join test', () => {
  let txInput: TxInput;
  let bptToken: Token;

  beforeAll(async () => {
    // setup mock api
    const api = new MockApi();

    // get pool state from api
    const poolInput = await api.getPool(poolId);

    const client: Client = createTestClient({
      mode: 'hardhat',
      chain: CHAINS[chainId],
      transport: http(rpcUrl),
    })
      .extend(publicActions)
      .extend(walletActions) as Client;

    txInput = {
      client,
      poolJoin: new PoolJoin(),
      slippage: Slippage.fromPercentage('1'), // 1%
      poolInput,
      testAddress: '0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f', // Balancer DAO Multisig
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
      ],
      [0,0,3],
      [
        ...txInput.poolInput.tokens.map((t) =>
          parseUnits('100', t.decimals),
        ),
      ],
      process.env.ETHEREUM_RPC_URL as string,
      blockNumber,
    );
  });

  test('unbalanced join', async () => {
    const bptIndex = txInput.poolInput.tokens.findIndex((t) => t.address === txInput.poolInput.address);
    const poolTokensWithoutBpt = txInput.poolInput.tokens.map(
      (t) => new Token(chainId, t.address, t.decimals),
    ).filter((_, index) => index !== bptIndex);

    const amountsIn = poolTokensWithoutBpt.map((t) =>
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
    expect(queryResult.amountsIn.filter((_, index)=>index!==bptIndex)).to.deep.eq(amountsIn);
    expect(queryResult.tokenInIndex).to.be.undefined;

    // Should be no native value
    expect(value).toBeUndefined;

    // Expect some bpt amount
    expect(queryResult.bptOut.amount > BigInt(0)).to.be.true;

    // Confirm slippage - only bpt out
    const expectedMinBpt = txInput.slippage.removeFrom(
      queryResult.bptOut.amount,
    );
    expect(expectedMinBpt).to.deep.eq(minBptOut);
    const expectedMaxAmountsIn = amountsIn.map((a) => a.amount);
    expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn.filter((_, index)=>index!==bptIndex));
  });

  test('native asset join', async () => {
    const bptIndex = txInput.poolInput.tokens.findIndex((t) => t.address === txInput.poolInput.address);

    const poolTokensWithoutBpt = txInput.poolInput.tokens.map(
      (t) => new Token(chainId, t.address, t.decimals),
    ).filter((_, index) => index !== bptIndex);

    const amountsIn = poolTokensWithoutBpt.map((t) =>
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
    expect(queryResult.amountsIn
      .filter((_, index)=>index!==bptIndex)
      .map((a) => a.amount)).to.deep.eq(
      amountsIn.map((a) => a.amount),
    );
    expect(queryResult.tokenInIndex).to.be.undefined;
    // Should have native value equal to input amount
    expect(value).eq(amountsIn[1].amount);

    // Expect some bpt amount
    expect(queryResult.bptOut.amount > BigInt(0)).to.be.true;

    // Confirm slippage - only bpt out
    const expectedMinBpt = txInput.slippage.removeFrom(
      queryResult.bptOut.amount,
    );
    expect(expectedMinBpt).to.deep.eq(minBptOut);
    const expectedMaxAmountsIn = amountsIn.map((a) => a.amount);
    expect(expectedMaxAmountsIn).to.deep.eq(maxAmountsIn.filter((_, index)=>index!==bptIndex));
  });

  test('single asset join', async () => {
    const bptIndex = txInput.poolInput.tokens.findIndex((t) => t.address === txInput.poolInput.address);
    const bptOut = TokenAmount.fromHumanAmount(bptToken, '1');
    const tokenIn = '0x4bc3263eb5bb2ef7ad9ab6fb68be80e43b43801f';

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
    queryResult.amountsIn.filter((_, index) => index!==bptIndex)
      .forEach((a, i) => {
      if (i === queryResult.tokenInIndex)
        expect(a.amount > BigInt(0)).to.be.true;
      else expect(a.amount === BigInt(0)).to.be.true;
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
    const bptIndex = txInput.poolInput.tokens.findIndex((t) => t.address === txInput.poolInput.address);

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
    queryResult.amountsIn.filter((_, index) => index!==bptIndex)
      .forEach((a) => {
      expect(a.amount > BigInt(0)).to.be.true;
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
        [...poolTokensAddr],
        client,
        testAddress,
        to,
        call,
        value,
      );
    const bptIndex = poolInput.tokens.findIndex((t) => t.address === poolInput.address);
    expect(transactionReceipt.status).to.eq('success');
    // Confirm final balance changes match query result
    const expectedDeltas = [
      ...queryResult.amountsIn.slice(0, bptIndex).map((a)=>a.amount),
      queryResult.bptOut.amount,
      ...queryResult.amountsIn.slice(bptIndex+1).map((a)=>a.amount)
    ]
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
          '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76' as Address, // vETH/WETH BPT
        decimals: 18,
        index: 0,
      },
      {
        address:
          '0x4bc3263eb5bb2ef7ad9ab6fb68be80e43b43801f' as Address, // VETH
        decimals: 18,
        index: 1,
      },
      {
        address:
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
        decimals: 18,
        index: 2,
      },
    ];

    return {
      id,
      address: getPoolAddress(id) as Address,
      type: 'PHANTOM_STABLE',
      tokens,
    };
  }
}

/******************************************************************************/
