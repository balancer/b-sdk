// pnpm test -- v3/permit2.integration.test.ts
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
    AddLiquidity,
    AddLiquidityKind,
    AddLiquidityUnbalancedInput,
    BALANCER_ROUTER,
    CHAINS,
    ChainId,
    Hex,
    InputAmount,
    PERMIT2,
    PoolState,
    PoolType,
    Slippage,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    AddLiquidityTxInput,
    approveSpenderOnTokens,
    assertAddLiquidityUnbalanced,
    doAddLiquidityWithSignature,
    POOLS,
    setTokenBalances,
    TOKENS,
} from 'test/lib/utils';
import { PermitDetails, getDetails, signPermit2 } from '@/entities/permit2';

const vaultVersion = 3;

const chainId = ChainId.SEPOLIA;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
const poolId = POOLS[chainId].MOCK_WETH_BAL_POOL.address;

const WETH = TOKENS[chainId].WETH;
const BAL = TOKENS[chainId].BAL;

describe('permit and permit 2 integration tests', () => {
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
        // const testAddress = '0x027917095a4d4964eFF7280676F405126BF9A6b5';

        const addLiquidityInput: AddLiquidityUnbalancedInput = {
            chainId,
            rpcUrl,
            kind: AddLiquidityKind.Unbalanced,
            amountsIn: poolState.tokens.map((t) => {
                return {
                    rawAmount: parseUnits('10', t.decimals),
                    decimals: t.decimals,
                    address: t.address,
                };
            }),
        };

        txInput = {
            client,
            addLiquidity: new AddLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            addLiquidityInput,
        };

        const tokens = [...txInput.poolState.tokens.map((t) => t.address)];

        await setTokenBalances(
            txInput.client,
            txInput.testAddress,
            tokens,
            [WETH.slot, BAL.slot] as number[],
            [
                ...txInput.poolState.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
            ],
        );

        await approveSpenderOnTokens(
            txInput.client,
            txInput.testAddress,
            tokens,
            PERMIT2[chainId],
        );
    });

    describe('permit2', () => {
        let addLiquidityInput: AddLiquidityUnbalancedInput;
        let amountsIn: InputAmount[];

        beforeAll(() => {
            amountsIn = txInput.poolState.tokens.map((t) => ({
                rawAmount: parseUnits('0.1', t.decimals),
                decimals: t.decimals,
                address: t.address,
            }));
            addLiquidityInput = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
                amountsIn,
            };
        });
        test('add liquidity unbalanced', async () => {
            const details: PermitDetails[] = [];
            for (const amountIn of amountsIn) {
                details.push(
                    await getDetails(
                        txInput.client,
                        amountIn.address,
                        txInput.testAddress,
                        BALANCER_ROUTER[chainId],
                    ),
                );
            }
            const { permit2Batch, permit2Signature } = await signPermit2(
                txInput.client,
                txInput.testAddress,
                BALANCER_ROUTER[chainId],
                details,
            );

            const addLiquidityOutput = await doAddLiquidityWithSignature({
                ...txInput,
                addLiquidityInput,
                permit2Batch,
                permit2Signature,
            });

            assertAddLiquidityUnbalanced(
                txInput.poolState,
                addLiquidityInput,
                addLiquidityOutput,
                txInput.slippage,
                vaultVersion,
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
