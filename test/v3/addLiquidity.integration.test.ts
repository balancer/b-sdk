// pnpm test -- addLiquidity.integration.test.ts

import { config } from 'dotenv';
config();

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
    AddLiquiditySingleTokenInput,
    AddLiquidityKind,
    Slippage,
    Hex,
    PoolState,
    CHAINS,
    ChainId,
    AddLiquidity,
    AddLiquidityInput,
    InputAmount,
    PoolType,
} from '../../src';
import { forkSetup } from '../lib/utils/helper';
import { AddLiquidityTxInput } from '../lib/utils/types';
import {
    doAddLiquidity,
    assertAddLiquidityUnbalanced,
    assertAddLiquiditySingleToken,
} from '../lib/utils/addLiquidityHelper';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';

const vaultVersion = 3;

const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
const chainId = ChainId.SEPOLIA;
const poolId = POOLS[chainId].MOCK_WEIGHTED_POOL.id;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('add liquidity test', () => {
    let txInput: AddLiquidityTxInput;
    let poolState: PoolState;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);

        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        const testAddress = (await client.getAddresses())[0];

        txInput = {
            client,
            addLiquidity: new AddLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            addLiquidityInput: {} as AddLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [...txInput.poolState.tokens.map((t) => t.address)],
            [WETH.slot, BAL.slot] as number[],
            [
                ...txInput.poolState.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
            ],
            undefined,
            vaultVersion,
        );
    });

    describe('add liquidity unbalanced', () => {
        let input: Omit<AddLiquidityUnbalancedInput, 'amountsIn'>;
        let amountsIn: InputAmount[];
        beforeAll(() => {
            amountsIn = txInput.poolState.tokens.map((t) => ({
                rawAmount: parseUnits('1', t.decimals),
                decimals: t.decimals,
                address: t.address,
            }));
            input = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
            };
        });
        test('token inputs', async () => {
            const addLiquidityInput = {
                ...input,
                amountsIn: [...amountsIn.splice(0, 1)],
            };
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
            });
            assertAddLiquidityUnbalanced(
                txInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
                vaultVersion,
            );
        });

        test('with native', async () => {
            const wethIsEth = true;
            const addLiquidityInput = {
                ...input,
                amountsIn,
            };
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
                wethIsEth,
            });
            assertAddLiquidityUnbalanced(
                txInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
                vaultVersion,
                wethIsEth,
            );
        });
    });

    describe('add liquidity single asset', () => {
        let input: AddLiquiditySingleTokenInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            };
            const tokenIn = WETH.address;
            input = {
                bptOut,
                tokenIn,
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.SingleToken,
            };
        });
        test('with token', async () => {
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput: input,
            });

            assertAddLiquiditySingleToken(
                txInput.poolState,
                input,
                addLiquidityOutput,
                txInput.slippage,
                vaultVersion,
            );
        });

        test('with native', async () => {
            const wethIsEth = true;
            const addLiquidityInput = {
                ...input,
            };
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
                wethIsEth,
            });

            assertAddLiquiditySingleToken(
                txInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
                vaultVersion,
                wethIsEth,
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/
class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: WETH.address,
                decimals: WETH.decimals,
                index: 0,
            },
            {
                address: BAL.address,
                decimals: BAL.decimals,
                index: 1,
            },
        ];

        return {
            id,
            address: id,
            type: PoolType.Weighted,
            tokens,
            vaultVersion,
        };
    }
}

/******************************************************************************/
