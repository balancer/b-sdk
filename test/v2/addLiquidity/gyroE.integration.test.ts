// pnpm test -- addLiquidity/gyroE.integration.test.ts

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
} from '../../../src';
import { forkSetup } from '../../lib/utils/helper';
import {
    assertAddLiquidityProportional,
    doAddLiquidity,
} from '../../lib/utils/addLiquidityHelper';
import { AddLiquidityTxInput } from '../../lib/utils/types';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { InputValidatorGyro } from '../../../src/entities/inputValidator/gyro/inputValidatorGyro';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.POLYGON);
const chainId = ChainId.POLYGON;
const poolId =
    '0xa489c057de6c3177380ea264ebdf686b7f564f510002000000000000000008e2'; // ECLP-wstETH-wETH

describe('gyroE V2 add liquidity test', () => {
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
            [0, 0, 0],
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
        test('with tokens', async () => {
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
            ).rejects.toThrowError(
                InputValidatorGyro.addLiquidityKindNotSupportedByGyro,
            );
        });
        //Removed test with native, because there are no GyroE V1 pool with wrapped native asset in any network
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
                InputValidatorGyro.addLiquidityKindNotSupportedByGyro,
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
            type: PoolType.GyroE,
            tokens: [
                {
                    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
                    decimals: 6,
                    index: 0,
                },
                {
                    address: '0x2e1ad108ff1d8c782fcbbb89aad783ac49586756', // TUSD
                    decimals: 18,
                    index: 1,
                },
            ],
            protocolVersion: 2,
        };
    }
}

/******************************************************************************/
