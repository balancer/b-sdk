// pnpm test -- addLiquidityGyroEV2.integration.test.ts
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    http,
    parseUnits,
    publicActions,
    walletActions,
    parseEther,
    Address,
} from 'viem';

import {
    AddLiquidityProportionalInput,
    AddLiquidityKind,
    Slippage,
    Hex,
    PoolStateInput,
    CHAINS,
    ChainId,
    AddLiquidity,
    AddLiquidityInput,
    InputAmount,
    getPoolAddress,
    AddLiquidityUnbalancedInput,
    AddLiquiditySingleTokenInput,
} from '../src';
import { forkSetup } from './lib/utils/helper';
import {
    assertAddLiquidityProportional,
    doAddLiquidity,
} from './lib/utils/addLiquidityHelper';
import { AddLiquidityTxInput } from './lib/utils/types';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { addLiquidityKindNotSupportedByGyro } from '../src/entities/addLiquidity/utils/validateInputs';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;
const poolId =
    '0xf01b0684c98cd7ada480bfdf6e43876422fa1fc10002000000000000000005de'; // ECLP-wstETH-wETH

describe('GyroE V2 add liquidity test', () => {
    let txInput: AddLiquidityTxInput;
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
            [0, 98, 0],
            [
                ...txInput.poolStateInput.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
                parseUnits('100', 18),
            ],
        );
    });

    describe('proportional', () => {
        let addLiquidityInput: AddLiquidityProportionalInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('2'),
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
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
            });

            assertAddLiquidityProportional(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput: {
                    ...addLiquidityInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
            });
            assertAddLiquidityProportional(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                {
                    ...addLiquidityInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
                addLiquidityOutput,
                txInput.slippage,
            );
        });
    });

    describe('unbalanced', () => {
        let input: Omit<AddLiquidityUnbalancedInput, 'amountsIn'>;
        let amountsIn: InputAmount[];
        beforeAll(() => {
            amountsIn = txInput.poolStateInput.tokens.map((t) => ({
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
        test('with tokens', async () => {
            const addLiquidityInput = {
                ...input,
                amountsIn: [...amountsIn.splice(0, 1)],
            };
            await expect(() =>
                doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                }),
            ).rejects.toThrowError(addLiquidityKindNotSupportedByGyro);
        });
    });

    describe('single token', () => {
        let addLiquidityInput: AddLiquiditySingleTokenInput;
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
                kind: AddLiquidityKind.SingleToken,
            };
        });

        test('must throw add liquidity kind not supported error', async () => {
            await expect(() =>
                doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                }),
            ).rejects.toThrowError(addLiquidityKindNotSupportedByGyro);
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Hex): Promise<PoolStateInput> {
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'GYROE',
            tokens: [
                {
                    address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wstETH
                    decimals: 18,
                    index: 0,
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // wETH
                    decimals: 18,
                    index: 1,
                },
            ],
        };
    }
}

/******************************************************************************/
