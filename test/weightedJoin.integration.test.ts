// pnpm test -- addLiquidityWeighted.integration.test.ts
import { describe, test, beforeAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
    walletActions,
    parseEther,
} from 'viem';

import {
    AddLiquidityUnbalancedInput,
    AddLiquidityProportionalInput,
    AddLiquiditySingleAssetInput,
    AddLiquidityKind,
    Slippage,
    Address,
    Hex,
    PoolStateInput,
    CHAINS,
    ChainId,
    getPoolAddress,
    AddLiquidity,
    AddLiquidityInput,
    InputAmount,
} from '../src';
import { forkSetup } from './lib/utils/helper';
import {
    assertProportionalJoin,
    assertSingleTokenJoin,
    assertUnbalancedJoin,
    doJoin,
} from './lib/utils/joinHelper';
import { JoinTxInput } from './lib/utils/types';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;
const poolId =
    '0x68e3266c9c8bbd44ad9dca5afbfe629022aee9fe000200000000000000000512'; // 80wjAURA-20WETH

describe('weighted join test', () => {
    let txInput: JoinTxInput;
    let poolStateInput: PoolStateInput;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolStateInput = await api.getPool(poolId);

        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        txInput = {
            client,
            addLiquidity: new AddLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolStateInput,
            testAddress: '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f', // Balancer DAO Multisig
            addLiquidityInput: {} as AddLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [
                ...txInput.poolStateInput.tokens.map((t) => t.address),
                txInput.poolStateInput.address,
            ],
            undefined, // TODO: hardcode these values to improve test performance
            [
                ...txInput.poolStateInput.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
                parseUnits('100', 18),
            ],
        );
    });

    describe('unbalanced join', () => {
        let input: Omit<AddLiquidityUnbalancedInput, 'amountsIn'>;
        let amountsIn: InputAmount[];
        beforeAll(() => {
            amountsIn = txInput.poolStateInput.tokens.map((t) => ({
                rawAmount: parseUnits('0.001', t.decimals),
                decimals: t.decimals,
                address: t.address,
            }));
            input = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
            };
        });
        test('with tokens', async () => {
            const addLiquidityInput = {
                ...input,
                amountsIn: [...amountsIn.splice(0, 1)],
            };

            const joinResult = await doJoin({
                ...txInput,
                addLiquidityInput,
            });
            assertUnbalancedJoin(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                addLiquidityInput,
                joinResult,
                txInput.slippage,
            );
        });

        test('with native', async () => {
            const addLiquidityInput = {
                ...input,
                amountsIn,
                useNativeAssetAsWrappedAmountIn: true,
            };
            const joinResult = await doJoin({
                ...txInput,
                addLiquidityInput,
            });
            assertUnbalancedJoin(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                addLiquidityInput,
                joinResult,
                txInput.slippage,
            );
        });
    });

    describe('single asset join', () => {
        let addLiquidityInput: AddLiquiditySingleAssetInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolStateInput.address,
            };
            const tokenIn = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
            addLiquidityInput = {
                bptOut,
                tokenIn,
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.SingleAsset,
            };
        });

        test('with token', async () => {
            const joinResult = await doJoin({
                ...txInput,
                addLiquidityInput,
            });

            assertSingleTokenJoin(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                addLiquidityInput,
                joinResult,
                txInput.slippage,
            );
        });

        test('with native', async () => {
            const joinResult = await doJoin({
                ...txInput,
                addLiquidityInput: {
                    ...addLiquidityInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
            });

            assertSingleTokenJoin(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                {
                    ...addLiquidityInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
                joinResult,
                txInput.slippage,
            );
        });
    });

    describe('proportional join', () => {
        let addLiquidityInput: AddLiquidityProportionalInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolStateInput.address,
            };
            addLiquidityInput = {
                bptOut,
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const joinResult = await doJoin({
                ...txInput,
                addLiquidityInput,
            });

            assertProportionalJoin(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                addLiquidityInput,
                joinResult,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const joinResult = await doJoin({
                ...txInput,
                addLiquidityInput: {
                    ...addLiquidityInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
            });

            assertProportionalJoin(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                {
                    ...addLiquidityInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
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
            type: 'WEIGHTED',
            tokens,
        };
    }
}

/******************************************************************************/
