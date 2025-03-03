import {
    Address,
    createTestClient,
    http,
    publicActions,
    TestActions,
    walletActions,
    parseUnits,
    parseEther,
} from 'viem';

import {
    AddLiquidityUnbalancedInput,
    AddLiquiditySingleTokenInput,
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
    PoolType,
    Permit2Helper,
    PERMIT2,
    PublicWalletClient,
    LBPParams,
    CreatePoolLiquidityBootstrappingInput,
    InitPool,
    InitPoolInput,
    InputToken,
} from '@/index';

import { BALANCER_ROUTER } from '@/index';

import { doCreatePool, getBalances } from '../../lib/utils/';

import {
    AddLiquidityTxInput,
    assertAddLiquidityUnbalanced,
    assertAddLiquiditySingleToken,
    assertAddLiquidityProportional,
    doAddLiquidity,
    POOLS,
    TOKENS,
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
    sendTransactionGetBalances,
    assertInitPool,
} from '../../lib/utils';

import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { AddLiquidityV3 } from '../../../src/entities/addLiquidity/addLiquidityV3/index';

const protocolVersion = 3;
const poolType = PoolType.LiquidityBootstrapping;
const chainId = ChainId.SEPOLIA;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('add liquidity bootstrapping test', () => {
    let client: PublicWalletClient & TestActions;
    let txInput: AddLiquidityTxInput;
    let poolState: PoolState;
    let tokens: Address[];
    let rpcUrl: string;
    let snapshot: Hex;
    let lbpParams: LBPParams;
    let createPoolInput: CreatePoolLiquidityBootstrappingInput;
    let poolAddress: Address;
    let testAddress: Address;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS[ChainId[chainId]],
            undefined,
            7783363n,
        ));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        tokens = [BAL.address, WETH.address];

        // initialize the lbp
        await setTokenBalances(
            client,
            testAddress,
            tokens,
            [BAL.slot, WETH.slot] as number[],
            [parseUnits('100', BAL.decimals), parseUnits('100', WETH.decimals)],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            tokens,
            PERMIT2[chainId],
        );

        lbpParams = {
            owner: testAddress,
            projectToken: BAL.address,
            reserveToken: WETH.address,
            projectTokenStartWeight: parseEther('0.5'),
            reserveTokenStartWeight: parseEther('0.5'),
            projectTokenEndWeight: parseEther('0.3'),
            reserveTokenEndWeight: parseEther('0.7'),
            startTime: BigInt(Math.floor(Date.now() / 1000) + 86400), // now + 1 day
            endTime: BigInt(Math.floor(Date.now() / 1000) + 691200), // now + 8 days
            blockProjectTokenSwapsIn: true,
        };

        createPoolInput = {
            protocolVersion: protocolVersion,
            swapFeePercentage: parseUnits('0.01', 18),
            lbpParams: lbpParams,
            symbol: 'LBP',
            chainId: chainId,
            poolType: PoolType.LiquidityBootstrapping,
        };
        poolAddress = await doCreatePool({
            client,
            createPoolInput,
            testAddress,
        });
        expect(poolAddress).toBeDefined();

        const initPoolInput: InitPoolInput = {
            minBptAmountOut: 0n,
            amountsIn: [
                {
                    address: WETH.address,
                    rawAmount: parseUnits('2', WETH.decimals),
                    decimals: WETH.decimals,
                },
                {
                    address: BAL.address,
                    rawAmount: parseUnits('33', BAL.decimals),
                    decimals: BAL.decimals,
                },
            ],
            chainId,
            wethIsEth: false,
        };

        const initPool = new InitPool();
        const permit2 = await Permit2Helper.signInitPoolApproval({
            ...initPoolInput,
            client,
            owner: testAddress,
        });

        const initPoolBuildOutput = initPool.buildCallWithPermit2(
            initPoolInput,
            {
                id: poolAddress,
                address: poolAddress,
                type: poolType,
                protocolVersion: 3,
                tokens: [
                    {
                        ...WETH,
                        index: 0,
                    },
                    {
                        ...BAL,
                        index: 1,
                    },
                ],
            },
            permit2,
        );

        const txOutput = await sendTransactionGetBalances(
            [WETH.address, BAL.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );
        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    });
    test('add liquidity', async () => {
        const addLiquidity = new AddLiquidityV3();
        const input: AddLiquidityInput = {
            chainId: chainId,
            rpcUrl: rpcUrl,
            sender: (await client.getAddresses())[0],
            userData: '0x',
            amountsIn: [
                {
                    address: WETH.address,
                    rawAmount: parseUnits('2', WETH.decimals),
                    decimals: WETH.decimals,
                },
                {
                    address: BAL.address,
                    rawAmount: parseUnits('33', BAL.decimals),
                    decimals: BAL.decimals,
                },
            ],
            kind: AddLiquidityKind.Unbalanced,
        };

        const poolState: PoolState = {
            id: poolAddress,
            address: poolAddress,
            type: 'LIQUIDITYBOOTSTRAPPING',
            tokens: [
                {
                    address: WETH.address,
                    index: 0,
                    decimals: WETH.decimals,
                },
                {
                    address: BAL.address,
                    index: 1,
                    decimals: BAL.decimals,
                },
            ],
            protocolVersion: 3,
        };

        const addLiquidityQueryOutput = await addLiquidity.query(
            input,
            poolState,
        );

        // generate the build call input
        const addLiquidityBuildInput = {
            ...addLiquidityQueryOutput,
            slippage: Slippage.fromPercentage('1'),
            wethIsEth: false,
        };

        const permit2 = await Permit2Helper.signAddLiquidityApproval({
            ...addLiquidityBuildInput,
            client,
            owner: testAddress,
        });

        const addLiquidityBuildCallOutput = addLiquidity.buildCallWithPermit2(
            addLiquidityBuildInput,
            permit2,
        );

        const balancesBefore = await getBalances(
            [BAL.address, WETH.address],
            client,
            testAddress,
        );

        const hash = await client.sendTransaction({
            data: addLiquidityBuildCallOutput.callData,
            account: testAddress,
            to: BALANCER_ROUTER[chainId],
            value: 0n,
            chain: client.chain,
        });

        const transactionReceipt = await client.waitForTransactionReceipt({
            hash,
        });
        expect(transactionReceipt.status).toBe('success');

        const balancesAfter = await getBalances(
            [BAL.address, WETH.address],
            client,
            testAddress,
        );

        balancesAfter.forEach((balance, i) => {
            expect(balance).toBeLessThan(balancesBefore[i]);
        });

        const bptBalance = await getBalances(
            [poolAddress],
            client,
            testAddress,
        );
        expect(bptBalance[0]).toBeGreaterThan(0);
    });
});
