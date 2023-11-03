// pnpm test -- composableStableJoin.integration.test.ts
import { describe, test, beforeAll, beforeEach } from 'vitest';
import { config } from 'dotenv';
config();

import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
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
    Address,
    Hex,
    PoolStateInput,
    CHAINS,
    ChainId,
    getPoolAddress,
    PoolJoin,
    JoinInput,
} from '../src';
import { forkSetup } from './lib/utils/helper';
import { JoinTxInput } from './lib/utils/types';
import {
    doJoin,
    assertUnbalancedJoin,
    assertSingleToken,
    assertProportional,
} from './lib/utils/joinHelper';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;
const poolId =
    '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76000000000000000000000570'; // Balancer vETH/WETH StablePool

describe('composable stable join test', () => {
    let txInput: JoinTxInput;
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
            poolStateInput: poolInput,
            testAddress: '0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f', // Balancer DAO Multisig
            joinInput: {} as JoinInput,
        };

        // setup BPT token
        bptToken = new Token(chainId, poolInput.address, 18, 'BPT');
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [...txInput.poolStateInput.tokens.map((t) => t.address)],
            [0, 0, 3],
            [
                ...txInput.poolStateInput.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
            ],
        );
    });

    describe('unbalanced join', () => {
        let input: Omit<UnbalancedJoinInput, 'amountsIn'>;
        let amountsIn: TokenAmount[];
        beforeAll(() => {
            const bptIndex = txInput.poolStateInput.tokens.findIndex(
                (t) => t.address === txInput.poolStateInput.address,
            );
            const poolTokensWithoutBpt = txInput.poolStateInput.tokens
                .map((t) => new Token(chainId, t.address, t.decimals))
                .filter((_, index) => index !== bptIndex);

            amountsIn = poolTokensWithoutBpt.map((t) =>
                TokenAmount.fromHumanAmount(t, '1'),
            );
            input = {
                chainId,
                rpcUrl,
                kind: JoinKind.Unbalanced,
            };
        });
        test('token inputs', async () => {
            const joinInput = {
                ...input,
                amountsIn: [...amountsIn.splice(0, 1)],
            };
            const joinResult = await doJoin({
                ...txInput,
                joinInput,
            });
            assertUnbalancedJoin(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                joinInput,
                joinResult,
                txInput.slippage,
            );
        });

        test('with native', async () => {
            const joinInput = {
                ...input,
                amountsIn,
                useNativeAssetAsWrappedAmountIn: true,
            };
            const joinResult = await doJoin({
                ...txInput,
                joinInput,
            });
            assertUnbalancedJoin(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                joinInput,
                joinResult,
                txInput.slippage,
            );
        });
    });

    describe('single asset join', () => {
        let input: SingleAssetJoinInput;
        beforeAll(() => {
            const bptOut = TokenAmount.fromHumanAmount(bptToken, '1');
            const tokenIn = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
            input = {
                bptOut,
                tokenIn,
                chainId,
                rpcUrl,
                kind: JoinKind.SingleAsset,
            };
        });
        test('with token', async () => {
            const joinResult = await doJoin({
                ...txInput,
                joinInput: input,
            });

            assertSingleToken(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                input,
                joinResult,
                txInput.slippage,
            );
        });

        test('with native', async () => {
            const joinInput = {
                ...input,
                useNativeAssetAsWrappedAmountIn: true,
            };
            const joinResult = await doJoin({
                ...txInput,
                joinInput,
            });

            assertSingleToken(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                joinInput,
                joinResult,
                txInput.slippage,
            );
        });
    });

    describe('proportional join', () => {
        let input: ProportionalJoinInput;
        beforeAll(() => {
            const bptOut = TokenAmount.fromHumanAmount(bptToken, '1');
            input = {
                bptOut,
                chainId,
                rpcUrl,
                kind: JoinKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const joinResult = await doJoin({
                ...txInput,
                joinInput: input,
            });

            assertProportional(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                input,
                joinResult,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const joinInput = {
                ...input,
                useNativeAssetAsWrappedAmountIn: true,
            };
            const joinResult = await doJoin({
                ...txInput,
                joinInput,
            });
            assertProportional(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                joinInput,
                joinResult,
                txInput.slippage,
            );
        });
    });
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
