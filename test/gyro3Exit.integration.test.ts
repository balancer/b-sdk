// pnpm test -- weightedExit.integration.test.ts
import { describe, test, beforeAll, beforeEach, expect } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import {
    createTestClient,
    http,
    parseEther,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';
import {
    SingleAssetExitInput,
    ProportionalExitInput,
    UnbalancedExitInput,
    ExitKind,
    Slippage,
    PoolStateInput,
    PoolExit,
    Address,
    Hex,
    CHAINS,
    ChainId,
    getPoolAddress,
    ExitInput,
    InputAmount,
} from '../src';
import { forkSetup } from './lib/utils/helper';
import { assertProportionalExit, doExit } from './lib/utils/exitHelper';
import { ExitTxInput } from './lib/utils/types';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { gyroExitKindNotSupported } from '../src/entities/exit/utils/validateInputs';

const chainId = ChainId.POLYGON;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.POLYGON);
const poolId =
    '0x17f1ef81707811ea15d9ee7c741179bbe2a63887000100000000000000000799'; // 3CLP-BUSD-USDC-USDT

describe('Gyro3 exit test', () => {
    let txInput: ExitTxInput;
    let poolInput: PoolStateInput;
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolInput = await api.getPool(poolId);

        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        txInput = {
            client,
            poolExit: new PoolExit(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolStateInput: poolInput,
            testAddress: '0xe84f75fc9caa49876d0ba18d309da4231d44e94d', // MATIC Holder Wallet, must hold amount of matic to approve tokens
            exitInput: {} as ExitInput,
        };
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [txInput.poolStateInput.address],
            [0],
            [parseUnits('1000', 18)],
        );
    });

    describe('proportional exit', () => {
        let input: ProportionalExitInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('0.01'),
                decimals: 18,
                address: poolInput.address,
            };
            input = {
                bptIn,
                chainId,
                rpcUrl,
                kind: ExitKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const exitResult = await doExit({
                ...txInput,
                exitInput: input,
            });

            assertProportionalExit(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                input,
                exitResult,
                txInput.slippage,
            );
            //Removed test with native, because there are no GyroE V1 pool with wrapped native asset in any network
        });
    });

    describe('unbalanced exit', async () => {
        let input: Omit<UnbalancedExitInput, 'amountsOut'>;
        let amountsOut: InputAmount[];
        beforeAll(() => {
            amountsOut = poolInput.tokens.map((t) => ({
                rawAmount: parseUnits('0.001', t.decimals),
                decimals: t.decimals,
                address: t.address,
            }));
            input = {
                chainId,
                rpcUrl,
                kind: ExitKind.Unbalanced,
            };
        });
        test('must throw error, exit kind not supported', async () => {
            const exitInput = {
                ...input,
                amountsOut: amountsOut.slice(0, 1),
            };
            await expect(() =>
                doExit({ ...txInput, exitInput }),
            ).rejects.toThrowError(gyroExitKindNotSupported);
        });
    });

    describe('single asset exit', () => {
        let input: SingleAssetExitInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolInput.address,
            };
            const tokenOut = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
            input = {
                chainId,
                rpcUrl,
                bptIn,
                tokenOut,
                kind: ExitKind.SingleAsset,
            };
        });
        test('must throw error, exit kind not supported', async () => {
            await expect(() =>
                doExit({ ...txInput, exitInput: input }),
            ).rejects.toThrowError(gyroExitKindNotSupported);
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getPool(id: Hex): Promise<PoolStateInput> {
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'GYRO3',
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
        };
    }
}

/******************************************************************************/
