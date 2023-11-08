// pnpm test -- weightedJoin.integration.test.ts
import { describe, test, beforeAll, beforeEach, expect } from 'vitest';
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
    ProportionalJoinInput,
    JoinKind,
    Slippage,
    Hex,
    PoolStateInput,
    CHAINS,
    ChainId,
    PoolJoin,
    JoinInput,
    InputAmount,
    getPoolAddress,
    UnbalancedJoinInput,
    SingleAssetJoinInput,
} from '../src';
import { forkSetup } from './lib/utils/helper';
import { assertProportionalJoin, doJoin } from './lib/utils/joinHelper';
import { JoinTxInput } from './lib/utils/types';
import { ANVIL_NETWORKS, startFork } from './anvil/anvil-global-setup';
import { gyroJoinKindNotSupported } from '../src/entities/join/utils/validateInputs';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;
const poolId =
    '0xf01b0684c98cd7ada480bfdf6e43876422fa1fc10002000000000000000005de'; // ECLP-wstETH-wETH

describe('gyro join test', () => {
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
            poolJoin: new PoolJoin(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolStateInput,
            testAddress: '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f', // Balancer DAO Multisig
            joinInput: {} as JoinInput,
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

    describe('proportional join', () => {
        let joinInput: ProportionalJoinInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('2'),
                decimals: 18,
                address: poolStateInput.address,
            };
            joinInput = {
                bptOut,
                chainId,
                rpcUrl,
                kind: JoinKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const joinResult = await doJoin({
                ...txInput,
                joinInput,
            });

            assertProportionalJoin(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                joinInput,
                joinResult,
                txInput.slippage,
            );
        });
        test('with native', async () => {
            const joinResult = await doJoin({
                ...txInput,
                joinInput: {
                    ...joinInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
            });
            console.log(joinResult.joinBuildOutput.value);
            assertProportionalJoin(
                txInput.client.chain?.id as number,
                txInput.poolStateInput,
                {
                    ...joinInput,
                    useNativeAssetAsWrappedAmountIn: true,
                },
                joinResult,
                txInput.slippage,
            );
        });
    });

    describe('unbalanced join', () => {
        let input: Omit<UnbalancedJoinInput, 'amountsIn'>;
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
                kind: JoinKind.Unbalanced,
            };
        });
        test('with tokens', async () => {
            const joinInput = {
                ...input,
                amountsIn: [...amountsIn.splice(0, 1)],
            };
            await expect(() =>
                doJoin({
                    ...txInput,
                    joinInput,
                }),
            ).rejects.toThrowError(gyroJoinKindNotSupported);
        });
    });

    describe('single asset join', () => {
        let joinInput: SingleAssetJoinInput;
        beforeAll(() => {
            const bptOut: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolStateInput.address,
            };
            const tokenIn = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
            joinInput = {
                bptOut,
                tokenIn,
                chainId,
                rpcUrl,
                kind: JoinKind.SingleAsset,
            };
        });

        test('must throw unsupported single asset join error', async () => {
            await expect(() =>
                doJoin({
                    ...txInput,
                    joinInput,
                }),
            ).rejects.toThrowError(gyroJoinKindNotSupported);
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
