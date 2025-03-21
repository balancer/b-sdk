// pnpm test -- cowAmm/removeLiquidity.integration.test.ts
import { config } from 'dotenv';
config();

import {
    createTestClient,
    http,
    parseEther,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';

import {
    AddLiquidity,
    AddLiquidityKind,
    AddLiquidityProportionalInput,
    CHAINS,
    ChainId,
    Hex,
    InputAmount,
    PoolState,
    PoolType,
    Slippage,
    RemoveLiquidity,
    RemoveLiquidityKind,
    RemoveLiquidityInput,
    RemoveLiquidityProportionalInput,
    RemoveLiquidityUnbalancedInput,
    poolTypeError,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    AddLiquidityTxInput,
    assertRemoveLiquidityProportional,
    doAddLiquidity,
    doRemoveLiquidity,
    forkSetupCowAmm,
    POOLS,
    RemoveLiquidityTxInput,
    TOKENS,
} from 'test/lib/utils';

const protocolVersion = 1;

const chainId = ChainId.SEPOLIA;
const poolId = POOLS[chainId].MOCK_COW_AMM_POOL.address;

const USDC = TOKENS[chainId].USDC;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI;

describe('remove liquidity test', () => {
    let prepTxInput: AddLiquidityTxInput;
    let txInput: RemoveLiquidityTxInput;
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

        const addLiquidityInput: AddLiquidityProportionalInput = {
            chainId,
            rpcUrl,
            kind: AddLiquidityKind.Proportional,
            referenceAmount: {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            },
        };

        prepTxInput = {
            client,
            addLiquidity: new AddLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            addLiquidityInput,
        };

        txInput = {
            client,
            removeLiquidity: new RemoveLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            removeLiquidityInput: {} as RemoveLiquidityInput,
        };
    });

    beforeEach(async () => {
        // setup by performing an add liquidity so it's possible to remove after that
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

        await doAddLiquidity(prepTxInput);
    });

    describe('proportional', () => {
        let input: RemoveLiquidityProportionalInput;
        beforeAll(() => {
            const bptIn: InputAmount = {
                rawAmount: parseEther('1'),
                decimals: 18,
                address: poolState.address,
            };
            input = {
                bptIn,
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const removeLiquidityOutput = await doRemoveLiquidity({
                ...txInput,
                removeLiquidityInput: input,
            });

            assertRemoveLiquidityProportional(
                txInput.poolState,
                input,
                removeLiquidityOutput,
                txInput.slippage,
                chainId,
                protocolVersion,
            );
        });
    });

    describe('remove liquidity unbalanced', () => {
        let removeLiquidityInput: RemoveLiquidityUnbalancedInput;
        beforeAll(() => {
            removeLiquidityInput = {
                chainId,
                rpcUrl,
                kind: RemoveLiquidityKind.Unbalanced,
                amountsOut: txInput.poolState.tokens.map((t) => ({
                    rawAmount: parseUnits('1', t.decimals),
                    decimals: t.decimals,
                    address: t.address,
                })),
            };
        });
        test('should fail as not supported', async () => {
            await expect(() =>
                doRemoveLiquidity({ ...txInput, removeLiquidityInput }),
            ).rejects.toThrowError(
                poolTypeError(
                    `Remove Liquidity ${removeLiquidityInput.kind}`,
                    poolState.type,
                    'Use Remove Liquidity Proportional',
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
