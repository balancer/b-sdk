// pnpm test -- addLiquidity/gyro3.integration.test.ts

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
    PoolState,
    CHAINS,
    ChainId,
    AddLiquidity,
    AddLiquidityInput,
    InputAmount,
    getPoolAddress,
    AddLiquidityUnbalancedInput,
    AddLiquiditySingleTokenInput,
    PoolType,
    poolTypeError,
} from '../../../src';
import {
    AddLiquidityTxInput,
    assertAddLiquidityProportional,
    doAddLiquidity,
    forkSetup,
} from '../../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.POLYGON);
const chainId = ChainId.POLYGON;
const poolId =
    '0x17f1ef81707811ea15d9ee7c741179bbe2a63887000100000000000000000799'; // 3CLP-BUSD-USDC-USDT

describe.skip('Gyro3 add liquidity test', () => {
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

        txInput = {
            client,
            addLiquidity: new AddLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress: '0xe84f75fc9caa49876d0ba18d309da4231d44e94d', // MATIC Holder Wallet, must hold amount of matic to approve tokens
            addLiquidityInput: {} as AddLiquidityInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [
                ...txInput.poolState.tokens.map((t) => t.address),
                txInput.poolState.address,
            ],
            [0, 51, 0, 0],
            [
                ...txInput.poolState.tokens.map((t) =>
                    parseUnits('10000', t.decimals),
                ),
                parseUnits('10000', 18),
            ],
        );
    });

    describe('proportional', () => {
        let addLiquidityInput: AddLiquidityProportionalInput;
        test('with bpt', async () => {
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
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
            });

            assertAddLiquidityProportional(
                txInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
                chainId,
            );
        });

        test('with reference amount (non-bpt)', async () => {
            const referenceAmount: InputAmount = {
                rawAmount: parseUnits('1', poolState.tokens[0].decimals),
                decimals: poolState.tokens[0].decimals,
                address: poolState.tokens[0].address,
            };
            addLiquidityInput = {
                referenceAmount,
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
            };
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
            });

            assertAddLiquidityProportional(
                txInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
                chainId,
            );
        });
        //Removed test with native, because there are no GyroE V1 pool with wrapped native asset in any network
    });

    describe('unbalanced', () => {
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
        test('must throw add liquidity kind not supported error', async () => {
            const addLiquidityInput = {
                ...input,
                amountsIn: [...amountsIn.splice(0, 1)],
            };
            await expect(() =>
                doAddLiquidity({
                    ...txInput,
                    addLiquidityInput,
                }),
            ).rejects.toThrowError(
                poolTypeError(
                    `Add Liquidity ${addLiquidityInput.kind}`,
                    poolState.type,
                    'Use Add Liquidity Proportional',
                ),
            );
        });
    });

    describe('single token', () => {
        let addLiquidityInput: AddLiquiditySingleTokenInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
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
            ).rejects.toThrowError(
                poolTypeError(
                    `Add Liquidity ${addLiquidityInput.kind}`,
                    poolState.type,
                    'Use Add Liquidity Proportional',
                ),
            );
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async getPool(id: Hex): Promise<PoolState> {
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.Gyro3,
            tokens: [
                {
                    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC(PoS)
                    decimals: 6,
                    index: 0,
                },
                {
                    address: '0x9c9e5fd8bbc25984b178fdce6117defa39d2db39', // BUSD
                    decimals: 18,
                    index: 1,
                },
                {
                    address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT(PoS)
                    decimals: 6,
                    index: 2,
                },
            ],
            protocolVersion: 2,
        };
    }
}

/******************************************************************************/
