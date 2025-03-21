// pnpm test -- cowAmm/addLiquidity.integration.test.ts

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
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidityProportionalInput,
    AddLiquidityUnbalancedInput,
    ChainId,
    CHAINS,
    Hex,
    PoolState,
    PoolType,
    poolTypeError,
    Slippage,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    AddLiquidityTxInput,
    assertAddLiquidityProportional,
    doAddLiquidity,
    forkSetupCowAmm,
    POOLS,
    TOKENS,
} from 'test/lib/utils';

const protocolVersion = 1;

const chainId = ChainId.SEPOLIA;
const poolId = POOLS[chainId].MOCK_COW_AMM_POOL.id;

const USDC = TOKENS[chainId].USDC;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI;

describe('add liquidity test', () => {
    let txInput: AddLiquidityTxInput;
    let poolState: PoolState;
    let rpcUrl: string;

    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.getPool(poolId);

        ({ rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]));

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
        await forkSetupCowAmm(
            txInput.client,
            txInput.testAddress,
            [...txInput.poolState.tokens.map((t) => t.address)],
            [USDC.slot, BAL.slot, DAI.slot] as number[],
            [
                ...txInput.poolState.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
            ],
            txInput.poolState.address,
        );
    });

    describe('add liquidity proportional', () => {
        let addLiquidityInput: AddLiquidityProportionalInput;
        beforeAll(() => {
            addLiquidityInput = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
                referenceAmount: {
                    rawAmount: parseUnits('1', 18),
                    decimals: 18,
                    address: txInput.poolState.address,
                },
            };
        });
        test('token inputs', async () => {
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
                protocolVersion,
            );
        });
    });

    describe('add liquidity unbalanced', () => {
        let addLiquidityInput: AddLiquidityUnbalancedInput;
        beforeAll(() => {
            addLiquidityInput = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
                amountsIn: txInput.poolState.tokens.map((t) => ({
                    rawAmount: parseUnits('1', t.decimals),
                    decimals: t.decimals,
                    address: t.address,
                })),
            };
        });
        test('should fail as not supported', async () => {
            await expect(() =>
                doAddLiquidity({ ...txInput, addLiquidityInput }),
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
        const tokens = [
            {
                address: USDC.address,
                decimals: USDC.decimals,
                index: 2,
            },
            {
                address: BAL.address,
                decimals: BAL.decimals,
                index: 0,
            },
            {
                address: DAI.address,
                decimals: DAI.decimals,
                index: 1,
            },
        ];

        return {
            id,
            address: id,
            type: PoolType.CowAmm,
            tokens,
            protocolVersion,
        };
    }
}

/******************************************************************************/
