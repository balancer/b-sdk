// pnpm test -- v3/permit.integration.test.ts
import { config } from 'dotenv';
config();

import {
    createTestClient,
    http,
    parseEther,
    parseSignature,
    parseUnits,
    publicActions,
    walletActions,
} from 'viem';

import {
    AddLiquidity,
    AddLiquidityKind,
    AddLiquidityUnbalancedInput,
    BALANCER_ROUTER,
    ChainId,
    CHAINS,
    getDetails,
    Hex,
    PERMIT2,
    PermitDetails,
    PoolState,
    PoolType,
    RemoveLiquidity,
    RemoveLiquidityKind,
    RemoveLiquidityProportionalInput,
    signPermit,
    signPermit2,
    Slippage,
    weightedPoolAbi_V3,
} from 'src';

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    AddLiquidityTxInput,
    approveSpenderOnTokens,
    assertAddLiquidityUnbalanced,
    assertRemoveLiquidityProportional,
    doAddLiquidityWithPermit2,
    doRemoveLiquidityWithPermit,
    POOLS,
    RemoveLiquidityTxInput,
    setTokenBalances,
    TOKENS,
} from 'test/lib/utils';

const vaultVersion = 3;

const chainId = ChainId.SEPOLIA;
const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA);
const poolId = POOLS[chainId].MOCK_WETH_BAL_POOL.address;

const WETH = TOKENS[chainId].WETH;
const BAL = TOKENS[chainId].BAL;

describe('permit and permit2 integration tests', () => {
    let poolState: PoolState;
    let addLiquidityTxInput: AddLiquidityTxInput;
    let removeLiquidityTxInput: RemoveLiquidityTxInput;
    let addLiquidityInput: AddLiquidityUnbalancedInput;
    let removeLiquidityInput: RemoveLiquidityProportionalInput;

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

        addLiquidityInput = {
            chainId,
            rpcUrl,
            kind: AddLiquidityKind.Unbalanced,
            amountsIn: poolState.tokens.map((t) => ({
                rawAmount: parseUnits('10', t.decimals),
                decimals: t.decimals,
                address: t.address,
            })),
        };

        removeLiquidityInput = {
            chainId,
            rpcUrl,
            kind: RemoveLiquidityKind.Proportional,
            bptIn: {
                rawAmount: parseEther('0.1'),
                decimals: 18,
                address: poolState.address,
            },
        };

        addLiquidityTxInput = {
            client,
            addLiquidity: new AddLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            addLiquidityInput,
        };

        removeLiquidityTxInput = {
            client,
            removeLiquidity: new RemoveLiquidity(),
            slippage: Slippage.fromPercentage('1'), // 1%
            poolState,
            testAddress,
            removeLiquidityInput,
        };

        const tokens = [...poolState.tokens.map((t) => t.address)];

        await setTokenBalances(
            removeLiquidityTxInput.client,
            removeLiquidityTxInput.testAddress,
            tokens,
            [WETH.slot, BAL.slot] as number[],
            [...poolState.tokens.map((t) => parseUnits('100', t.decimals))],
        );

        await approveSpenderOnTokens(
            removeLiquidityTxInput.client,
            removeLiquidityTxInput.testAddress,
            tokens,
            PERMIT2[chainId],
        );
    });

    test('permit should succeed', async () => {
        const { permitApproval, permitSignature } = await signPermit(
            removeLiquidityTxInput.client,
            poolState.address,
            removeLiquidityTxInput.testAddress,
            BALANCER_ROUTER[chainId],
            removeLiquidityInput.bptIn.rawAmount,
        );

        const { r, s, v } = parseSignature(permitSignature);

        const args = [
            permitApproval.owner,
            permitApproval.spender,
            permitApproval.amount,
            permitApproval.deadline,
            Number(v),
            r,
            s,
        ] as const;

        const hash = await removeLiquidityTxInput.client.writeContract({
            account: removeLiquidityTxInput.testAddress,
            chain: CHAINS[chainId],
            address: poolState.address,
            abi: weightedPoolAbi_V3,
            functionName: 'permit',
            args,
        });
        const transactionReceipt =
            await removeLiquidityTxInput.client.waitForTransactionReceipt({
                hash,
            });
        expect(transactionReceipt.status).to.eq('success');
    });

    test('add liquidity with permit2, then remove liquidity using permit', async () => {
        const details: PermitDetails[] = [];
        for (const amountIn of addLiquidityInput.amountsIn) {
            details.push(
                await getDetails(
                    addLiquidityTxInput.client,
                    amountIn.address,
                    addLiquidityTxInput.testAddress,
                    BALANCER_ROUTER[chainId],
                    amountIn.rawAmount,
                ),
            );
        }
        const { permit2Batch, permit2Signature } = await signPermit2(
            addLiquidityTxInput.client,
            addLiquidityTxInput.testAddress,
            BALANCER_ROUTER[chainId],
            details,
        );

        const addLiquidityOutput = await doAddLiquidityWithPermit2({
            ...addLiquidityTxInput,
            addLiquidityInput,
            permit2Batch,
            permit2Signature,
        });

        assertAddLiquidityUnbalanced(
            addLiquidityTxInput.poolState,
            addLiquidityInput,
            addLiquidityOutput,
            addLiquidityTxInput.slippage,
            vaultVersion,
        );

        const { permitApproval, permitSignature } = await signPermit(
            removeLiquidityTxInput.client,
            poolState.address,
            removeLiquidityTxInput.testAddress,
            BALANCER_ROUTER[chainId],
            removeLiquidityInput.bptIn.rawAmount,
        );

        const removeLiquidityOutput = await doRemoveLiquidityWithPermit({
            ...removeLiquidityTxInput,
            removeLiquidityInput,
            permitApproval,
            permitSignature,
        });

        assertRemoveLiquidityProportional(
            removeLiquidityTxInput.poolState,
            removeLiquidityInput,
            removeLiquidityOutput,
            removeLiquidityTxInput.slippage,
            vaultVersion,
        );
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
