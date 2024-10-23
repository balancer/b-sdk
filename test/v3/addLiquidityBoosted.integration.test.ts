// pnpm test -- v3/addLiquidityBoosted.integration.test.ts

import { config } from 'dotenv';
config();

import {
    Address,
    createTestClient,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';

import {
    AddLiquidityUnbalancedInput,
    AddLiquidityProportionalInput,
    AddLiquidityKind,
    Slippage,
    Hex,
    PoolState,
    PoolStateWithUnderlyings,
    BalancerApi,
    CHAINS,
    ChainId,
    AddLiquidityBoostedV3,
    AddLiquidityInput,
    PERMIT2,
    Token,
    PublicWalletClient,
} from '../../src';
import {
    AddLiquidityTxInput,
    assertAddLiquidityUnbalanced,
    assertAddLiquidityProportional,
    doAddLiquidity,
    setTokenBalances,
    approveSpenderOnTokens,
    approveTokens,
} from '../lib/utils';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';

const protocolVersion = 3;

const chainId = ChainId.SEPOLIA;
// https://sepolia.etherscan.io/address/0x797c69b235cb047c9331d39c96f30f76dce6444d#readContract
// deploy 9
const poolid = '0x797c69b235cb047c9331d39c96f30f76dce6444d';
const stataUSDC = 0x8a88124522dbbf1e56352ba3de1d9f78c143751e;
const USDC = {
    address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    decimals: 6,
    slot: 0,
};
const stataDAI = 0xde46e43f46ff74a23a65ebb0580cbe3dfe684a17;
const DAI = {
    address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
    decimals: 18,
    slot: 0,
};

describe('add liquidity test', () => {
    let client: PublicWalletClient & TestActions;
    let txInput: AddLiquidityTxInput;
    let poolState: PoolState;
    let poolStateWithUnderlyings: PoolStateWithUnderlyings;
    let tokens: Address[];
    let rpcUrl: string;
    let snapshot: Hex;
    let testAddress: Address;

    beforeAll(async () => {
        // get the PoolState from the Api
        const balancerApi = new BalancerApi(
            'https://test-api-v3.balancer.fi/',
            chainId,
        );
        poolState = await balancerApi.pools.fetchPoolState(poolid);
        poolStateWithUnderlyings =
            await balancerApi.pools.fetchPoolStateWithUnderlyingTokens(poolid);

        ({ rpcUrl } = await startFork(ANVIL_NETWORKS[ChainId[chainId]]));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        await setTokenBalances(
            client,
            testAddress,
            [DAI.address, USDC.address] as Address[],
            [DAI.slot, USDC.slot] as number[],
            [parseUnits('100', DAI.decimals), parseUnits('100', USDC.decimals)],
        );

        // approve Permit2 to spend users DAI/USDC
        // does not include the sub approvals
        await approveSpenderOnTokens(
            client,
            testAddress,
            [DAI.address, USDC.address] as Address[],
            PERMIT2[chainId],
        );

        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    describe('permit 2 direct approval', () => {
        // Permit2 is approved to spend users DAI/USDC
        // Adding liquidity with the composite Router allows to join boosted pools via underlying tokens
        beforeEach(async () => {
            // Permit2 is approved to spend users DAI/USDC
            // Here We approve the Vault to spend Tokens on the users behalf via Permit2
            await approveTokens(
                client,
                testAddress as Address,
                [DAI.address, USDC.address] as Address[],
                protocolVersion,
            );
        });
        describe('add liquidity unbalanced', () => {
            test('with tokens', async () => {
                // AddLiquidityInput type is required which can be AddLiquidityUnbalancedInput
                const input: AddLiquidityUnbalancedInput = {
                    chainId,
                    rpcUrl,
                    amountsIn: [
                        {
                            rawAmount: 1000000n,
                            decimals: 6,
                            address: USDC.address as Address,
                        },
                        {
                            rawAmount: 1000000000000000000n,
                            decimals: 18,
                            address: DAI.address as Address,
                        },
                    ],
                    kind: AddLiquidityKind.Unbalanced,
                };

                const slippage: Slippage = Slippage.fromPercentage('1');
                const wethIsEth = false;

                txInput = {
                    client,
                    addLiquidity: new AddLiquidityBoostedV3(),
                    slippage: Slippage.fromPercentage('1'),
                    poolState,
                    testAddress,
                    addLiquidityInput: {} as AddLiquidityInput,
                };

                // join with underlying (via composite liquidity router)
                // indicated by true
                const addLiquidityOutput = await doAddLiquidity(
                    {
                        ...txInput,
                        addLiquidityInput: input,
                    },
                    true,
                );

                //establish underlying Tokens
                const underlyingTokens: Token[] = [
                    new Token(11155111, USDC.address as Address, USDC.decimals), //051e
                    new Token(11155111, DAI.address as Address, DAI.decimals), //a17
                ];

                assertAddLiquidityUnbalanced(
                    poolState,
                    input,
                    addLiquidityOutput,
                    slippage,
                    protocolVersion,
                    wethIsEth,
                    underlyingTokens,
                );
            });
            test('with native', async () => {
                // TODO
            });
        });
        describe('add liquidity proportional', () => {
            test.only('with tokens', async () => {
                const slippage: Slippage = Slippage.fromPercentage('1');
                const wethIsEth = false;

                txInput = {
                    client,
                    addLiquidity: new AddLiquidityBoostedV3(),
                    slippage: slippage,
                    poolState: poolStateWithUnderlyings,
                    testAddress,
                    addLiquidityInput: {} as AddLiquidityInput,
                };

                const input: AddLiquidityProportionalInput = {
                    chainId: chainId,
                    rpcUrl: rpcUrl,
                    referenceAmount: {
                        rawAmount: 1000000000000000000n,
                        decimals: 6,
                        address: USDC.address as Address,
                    },
                    kind: AddLiquidityKind.Proportional,
                };

                // join with underlying (via composite liquidity router)
                // indicated by true
                const addLiquidityOutput = await doAddLiquidity(
                    {
                        ...txInput,
                        addLiquidityInput: input,
                    },
                    true,
                );

                assertAddLiquidityProportional(
                    poolState,
                    input,
                    addLiquidityOutput,
                    slippage,
                    protocolVersion,
                    wethIsEth,
                );
            });
            test('with native', async () => {});
        });
    });

    describe('permit 2 signatures', () => {});
});
