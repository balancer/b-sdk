import {
    AddLiquidity,
    Slippage,
    AddLiquidityInput,
    AddLiquidityKind,
    AddLiquidityUnbalancedInput,
    AddLiquidityProportionalInput,
    PoolStateWithBalances,
} from '@/entities';
import { CHAINS, ChainId, getPoolAddress } from '@/utils';
import { startFork, ANVIL_NETWORKS } from 'test/anvil/anvil-global-setup';
import { AddLiquidityTxInput } from 'test/lib/utils/types';
import {
    Address,
    Hex,
    createTestClient,
    http,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';

import { forkSetup } from 'test/lib/utils/helper';
import { InputAmount, PoolType } from '@/types';
import { doAddLiquidity } from 'test/lib/utils/addLiquidityHelper';
import { HumanAmount } from '@/data';
import { TOKENS } from 'test/lib/utils/addresses';
import { calculateProportionalAmounts } from '@/entities/utils/calculateProportionalAmounts';

const { rpcUrl } = await startFork(ANVIL_NETWORKS.MAINNET);
const chainId = ChainId.MAINNET;
const poolId =
    '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76000000000000000000000570'; // Balancer vETH/WETH StablePool

describe('add liquidity composable stable test', () => {
    let txInput: AddLiquidityTxInput;
    let poolState: PoolStateWithBalances;
    let functionOutput: { amountsIn: InputAmount[]; bptOut: InputAmount };
    beforeAll(async () => {
        // setup mock api
        const api = new MockApi();

        // get pool state from api
        poolState = await api.fetchPoolStateWithBalances(poolId);

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
            poolState: poolState,
            testAddress: '0x10a19e7ee7d7f8a52822f6817de8ea18204f2e4f', // Balancer DAO Multisig
            addLiquidityInput: {} as AddLiquidityInput,
        };
        const vETHAmount: InputAmount = {
            address: TOKENS[chainId].vETH.address,
            decimals: TOKENS[chainId].vETH.decimals,
            rawAmount: BigInt(1e18),
        };
        functionOutput = calculateProportionalAmounts(poolState, vETHAmount);
    });

    beforeEach(async () => {
        await forkSetup(
            txInput.client,
            txInput.testAddress,
            [...txInput.poolState.tokens.map((t) => t.address)],
            [0, 0, 3],
            [
                ...txInput.poolState.tokens.map((t) =>
                    parseUnits('100', t.decimals),
                ),
            ],
        );
    });

    describe('add liquidity unbalanced', () => {
        let input: Omit<AddLiquidityUnbalancedInput, 'amountsIn'>;
        beforeAll(() => {
            input = {
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Unbalanced,
            };
        });
        test('token inputs', async () => {
            const addLiquidityInput = {
                ...input,
                amountsIn: functionOutput.amountsIn,
            };
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput,
            });
            let delta =
                addLiquidityOutput.addLiquidityQueryOutput.bptOut.amount -
                functionOutput.bptOut.rawAmount;
            if (delta < 0) {
                delta = -delta;
            }
            expect(delta < 10n).to.be.true; // 10n of tolerance
        });
    });
    describe('add liquidity proportional', () => {
        let input: AddLiquidityProportionalInput;
        beforeAll(() => {
            input = {
                bptOut: functionOutput.bptOut,
                chainId,
                rpcUrl,
                kind: AddLiquidityKind.Proportional,
            };
        });
        test('with tokens', async () => {
            const addLiquidityOutput = await doAddLiquidity({
                ...txInput,
                addLiquidityInput: input,
            });

            addLiquidityOutput.addLiquidityQueryOutput.amountsIn
                .slice(1)
                .forEach(({ amount }, index) => {
                    const signedDelta =
                        amount - functionOutput.amountsIn[index].rawAmount;
                    const delta = signedDelta < 0 ? -signedDelta : signedDelta;
                    console.log(delta);
                    expect(delta < 10n).to.be.true; // 10n of tolerance
                });
        });
    });
});

/*********************** Mock To Represent API Requirements **********************/

class MockApi {
    public async fetchPoolStateWithBalances(
        id: Hex,
    ): Promise<PoolStateWithBalances> {
        const tokens = [
            {
                symbol: 'vETH/WETH BPT',
                name: 'Balancer vETH/WETH StablePool',
                address:
                    '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76' as Address, // vETH/WETH BPT
                decimals: 18,
                index: 0,
                balance: '2596148429267413.794052669613761796' as HumanAmount,
            },
            {
                symbol: 'vETH',
                name: 'Voucher Ethereum 2.0',
                address:
                    '0x4bc3263eb5bb2ef7ad9ab6fb68be80e43b43801f' as Address, // VETH
                decimals: 18,
                index: 1,
                balance: '1.045187143371175654' as HumanAmount,
            },
            {
                name: 'Wrapped Ether',
                symbol: 'WETH',
                address:
                    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
                decimals: 18,
                index: 2,
                balance: '0.813652579142753934' as HumanAmount,
            },
        ];

        return {
            id,
            address: getPoolAddress(id) as Address,
            type: PoolType.ComposableStable,
            tokens,
            totalShares: '1.879969119336134102' as HumanAmount,
            balancerVersion: 2,
        };
    }
}

/******************************************************************************/
