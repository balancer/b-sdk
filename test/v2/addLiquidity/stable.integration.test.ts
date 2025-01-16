// pnpm test -- addLiquidity/stable.integration.test.ts

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
    AddLiquiditySingleTokenInput,
    AddLiquidityKind,
    Slippage,
    Address,
    Hex,
    PoolState,
    CHAINS,
    ChainId,
    getPoolAddress,
    AddLiquidity,
    AddLiquidityInput,
    InputAmount,
    PoolType,
    addLiquidityProportionalNotSupportedOnPoolTypeError,
} from 'src';
import {
    AddLiquidityTxInput,
    POOLS,
    TOKENS,
    assertAddLiquiditySingleToken,
    assertAddLiquidityUnbalanced,
    doAddLiquidity,
    forkSetup,
} from 'test/lib/utils';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';

const chainId = ChainId.MAINNET;
const poolId = POOLS[chainId].wstETH_wETH_MSP.id; // B-stETH-STABLE

describe('add liquidity stable test', () => {
    let txInput: AddLiquidityTxInput;
    let poolState: PoolState;
    let rpcUrl: string;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);

        // TODO: figure out why these tests fail when udpating blockNumber to 21373640n
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.MAINNET,
            undefined,
            18980070n,
        ));

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
            txInput.poolState.tokens.map((t) => t.address),
            [0, 3],
            txInput.poolState.tokens.map((t) => parseUnits('100', t.decimals)),
        );
    });

    describe('add liquidity unbalanced', () => {
        let input: Omit<AddLiquidityUnbalancedInput, 'amountsIn'>;
        let amountsIn: InputAmount[];
        beforeAll(() => {
            amountsIn = txInput.poolState.tokens.map((t) => ({
                rawAmount: parseUnits('0.1', t.decimals),
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
                amountsIn,
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
                chainId,
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
                chainId,
                poolState.protocolVersion as 2 | 3,
                wethIsEth,
            );
        });
    });

    describe('add liquidity single asset', () => {
        let addLiquidityInput: AddLiquiditySingleTokenInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            };
            const tokenIn = TOKENS[chainId].WETH.address;
            addLiquidityInput = {
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
                addLiquidityInput,
            });

            assertAddLiquiditySingleToken(
                txInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
                chainId,
            );
        });

        test('with native', async () => {
            const wethIsEth = true;
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
                chainId,
                poolState.protocolVersion as 2 | 3,
                wethIsEth,
            );
        });
    });

    describe('add liquidity proportional', () => {
        let addLiquidityInput: AddLiquidityProportionalInput;
        beforeAll(() => {
            const referenceAmount: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            };
            addLiquidityInput = {
                referenceAmount,
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
            };
        });
        test('should throw as not supported', async () => {
            await expect(() =>
                doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                }),
            ).rejects.toThrowError(
                addLiquidityProportionalNotSupportedOnPoolTypeError(
                    poolState.type,
                ),
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        const tokens = [
            {
                address: TOKENS[chainId].wstETH.address,
                decimals: TOKENS[chainId].wstETH.decimals,
                index: 0,
            },
            {
                address: TOKENS[chainId].WETH.address,
                decimals: TOKENS[chainId].WETH.decimals,
                index: 1,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.MetaStable,
            tokens,
            protocolVersion: 2,
        };
    }
}

/******************************************************************************/
