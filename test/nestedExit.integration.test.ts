// pnpm test -- nestedExit.integration.test.ts
import { describe, expect, test, beforeAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import {
    Client,
    createTestClient,
    http,
    parseUnits,
    publicActions,
    PublicActions,
    TestActions,
    WalletActions,
    walletActions,
} from 'viem';

import {
    Slippage,
    NestedExit,
    replaceWrapped,
    NestedPoolState,
} from '../src/entities';
import { Address } from '../src/types';

import {
    BALANCER_RELAYER,
    BALANCER_VAULT,
    CHAINS,
    ChainId,
} from '../src/utils';

import {
    approveToken,
    findTokenBalanceSlot,
    sendTransactionGetBalances,
    setTokenBalance,
} from './lib/utils/helper';
import { authorizerAbi, vaultAbi } from '../src/abi';
import { Relayer } from '../src/entities/relayer';
import {
    NestedProportionalExitInput,
    NestedSingleTokenExitInput,
} from '../src/entities/nestedExit/types';

/**
 * Deploy the new relayer contract with the new helper address:
 *
 * in the mono repo:
 * cd pkg/standalone-utils
 * forge create --rpc-url http://0.0.0.0:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 contracts/BatchRelayerQueryLibrary.sol:BatchRelayerQueryLibrary --constructor-args "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
 *
 * [take the address]
 *
 * forge create --rpc-url http://0.0.0.0:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 contracts/relayer/BalancerRelayer.sol:BalancerRelayer --constructor-args "0xBA12222222228d8Ba445958a75a0704d566BF2C8" "0xf77018c0d817da22cadbdf504c00c0d32ce1e5c2" "[paste the address]" "5"
 *
 * update `BALANCER_RELAYER` on constants.ts
 *
 */

type TxInput = {
    bptAmountIn: bigint;
    chainId: ChainId;
    rpcUrl: string;
    testAddress: Address;
    nestedExit: NestedExit;
    nestedPoolFromApi: NestedPoolState;
    client: Client & PublicActions & TestActions & WalletActions;
    tokenOut?: Address;
    useNativeAssetAsWrappedAmountOut?: boolean;
};

describe('nested exit test', () => {
    let api: MockApi;
    let chainId: ChainId;
    let rpcUrl: string;
    let client: Client & PublicActions & TestActions & WalletActions;
    let poolAddress: Address;
    let nestedPoolFromApi: NestedPoolState;
    let nestedExit: NestedExit;
    let testAddress: Address;

    beforeAll(async () => {
        // setup mock api
        api = new MockApi();

        // setup chain and test client
        chainId = ChainId.MAINNET;
        rpcUrl = 'http://127.0.0.1:8545/';
        client = createTestClient({
            mode: 'hardhat',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        poolAddress = '0x08775ccb6674d6bdceb0797c364c2653ed84f384'; // WETH-3POOL-BPT

        // get pool state from api
        nestedPoolFromApi = await api.getNestedPool(poolAddress);

        // setup join helper
        nestedExit = new NestedExit();

        // Fork setup - done only once per fork reset
        // Governance grant roles to the relayer
        await grantRoles(client);

        // User approve vault to spend their tokens and update user balance
        const tokens = [
            ...new Set(
                nestedPoolFromApi.pools.flatMap((p) => {
                    return { address: p.address, decimals: 18 };
                }),
            ),
        ];
        for (const token of tokens) {
            await approveToken(client, testAddress, token.address);

            const slot = (await findTokenBalanceSlot(
                client,
                testAddress,
                token.address,
            )) as number;

            await setTokenBalance(
                client,
                testAddress,
                token.address,
                slot,
                parseUnits('1000', token.decimals),
            );
        }
    });

    test('proportional exit', async () => {
        const bptAmountIn = parseUnits('1', 18);
        await doTransaction({
            bptAmountIn,
            chainId,
            rpcUrl,
            testAddress,
            nestedExit,
            nestedPoolFromApi,
            client,
        });
    });

    test('proportional exit - native asset', async () => {
        const bptAmountIn = parseUnits('1', 18);

        await doTransaction({
            bptAmountIn,
            chainId,
            rpcUrl,
            testAddress,
            nestedExit,
            nestedPoolFromApi,
            client,
            useNativeAssetAsWrappedAmountOut: true,
        });
    });

    test('single token exit', async () => {
        const bptAmountIn = parseUnits('1', 18);
        const tokenOut = '0x6b175474e89094c44da98b954eedeac495271d0f'; // DAI
        await doTransaction({
            bptAmountIn,
            chainId,
            rpcUrl,
            testAddress,
            nestedExit,
            nestedPoolFromApi,
            client,
            tokenOut,
        });
    });

    test('single token exit - native asset', async () => {
        const bptAmountIn = parseUnits('1', 18);
        const tokenOut = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
        await doTransaction({
            bptAmountIn,
            chainId,
            rpcUrl,
            testAddress,
            nestedExit,
            nestedPoolFromApi,
            client,
            tokenOut,
            useNativeAssetAsWrappedAmountOut: true,
        });
    });
});

export const doTransaction = async ({
    bptAmountIn,
    chainId,
    rpcUrl,
    testAddress,
    nestedExit,
    nestedPoolFromApi,
    client,
    tokenOut,
    useNativeAssetAsWrappedAmountOut = false,
}: TxInput) => {
    const exitInput: NestedProportionalExitInput | NestedSingleTokenExitInput =
        {
            bptAmountIn,
            chainId,
            rpcUrl,
            accountAddress: testAddress,
            useNativeAssetAsWrappedAmountOut,
            tokenOut,
        };
    const queryResult = await nestedExit.query(exitInput, nestedPoolFromApi);

    // build join call with expected minBpOut based on slippage
    const slippage = Slippage.fromPercentage('1'); // 1%

    const signature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        testAddress,
        client,
    );

    const { call, to, minAmountsOut } = nestedExit.buildCall({
        ...queryResult,
        slippage,
        sender: testAddress,
        recipient: testAddress,
        relayerApprovalSignature: signature,
    });

    let tokensOut = minAmountsOut.map((a) => a.token);
    if (useNativeAssetAsWrappedAmountOut) {
        tokensOut = replaceWrapped(tokensOut, chainId);
    }

    // send join transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                queryResult.bptAmountIn.token.address,
                ...tokensOut.map((t) => t.address),
            ],
            client,
            testAddress,
            to,
            call,
        );

    expect(transactionReceipt.status).to.eq('success');
    queryResult.amountsOut.map(
        (amountOut) => expect(amountOut.amount > 0n).to.be.true,
    );
    const expectedDeltas = [
        queryResult.bptAmountIn.amount,
        ...queryResult.amountsOut.map((amountOut) => amountOut.amount),
    ];
    expect(expectedDeltas).to.deep.eq(balanceDeltas);
    const expectedMinAmountsOut = queryResult.amountsOut.map((amountOut) =>
        slippage.removeFrom(amountOut.amount),
    );
    expect(expectedMinAmountsOut).to.deep.eq(
        minAmountsOut.map((a) => a.amount),
    );
};

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getNestedPool(address: Address): Promise<NestedPoolState> {
        if (address !== '0x08775ccb6674d6bdceb0797c364c2653ed84f384')
            throw Error();
        return {
            pools: [
                {
                    id: '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0',
                    address: '0x08775ccb6674d6bdceb0797c364c2653ed84f384',
                    type: 'Weighted',
                    level: 1,
                    tokens: [
                        {
                            address:
                                '0x79c58f70905f734641735bc61e45c19dd9ad60bc', // 3POOL-BPT
                            decimals: 18,
                            index: 0,
                        },
                        {
                            address:
                                '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                            decimals: 18,
                            index: 1,
                        },
                    ],
                },
                {
                    id: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
                    address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc',
                    type: 'ComposableStable',
                    level: 0,
                    tokens: [
                        {
                            address:
                                '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
                            decimals: 18,
                            index: 0,
                        },
                        {
                            address:
                                '0x79c58f70905f734641735bc61e45c19dd9ad60bc', // 3POOL-BPT
                            decimals: 18,
                            index: 1,
                        },
                        {
                            address:
                                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
                            decimals: 6,
                            index: 2,
                        },
                        {
                            address:
                                '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
                            decimals: 6,
                            index: 3,
                        },
                    ],
                },
            ],
        };
    }
}

export const grantRoles = async (
    client: Client & TestActions & WalletActions,
) => {
    const balancerDaoAddress = '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f';
    const authorizerAddress = '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6';

    // Check for available roles on balancer-deployments repo:
    // https://github.com/balancer/balancer-deployments/blob/master/action-ids/mainnet/action-ids.json
    const exitRole =
        '0xc149e88b59429ded7f601ab52ecd62331cac006ae07c16543439ed138dcb8d34';
    const joinRole =
        '0x78ad1b68d148c070372f8643c4648efbb63c6a8a338f3c24714868e791367653';
    const swapRole =
        '0x7b8a1d293670124924a0f532213753b89db10bde737249d4540e9a03657d1aff';
    const batchSwapRole =
        '0x1282ab709b2b70070f829c46bc36f76b32ad4989fecb2fcb09a1b3ce00bbfc30';
    const setRelayerApprovalRole =
        '0x0014a06d322ff07fcc02b12f93eb77bb76e28cdee4fc0670b9dec98d24bbfec8';

    await client.impersonateAccount({
        address: balancerDaoAddress,
    });
    const roles: Address[] = [
        exitRole,
        joinRole,
        swapRole,
        batchSwapRole,
        setRelayerApprovalRole,
    ];
    const chainId = await client.getChainId();
    for (const role of roles) {
        await client.writeContract({
            account: balancerDaoAddress,
            address: authorizerAddress,
            chain: client.chain,
            abi: authorizerAbi,
            functionName: 'grantRole',
            args: [role, BALANCER_RELAYER[chainId]],
        });
    }
    await client.stopImpersonatingAccount({
        address: balancerDaoAddress,
    });
};

export const approveRelayer = async (
    client: Client & WalletActions,
    account: Address,
) => {
    const chainId = await client.getChainId();
    await client.writeContract({
        account,
        address: BALANCER_VAULT,
        chain: client.chain,
        abi: vaultAbi,
        functionName: 'setRelayerApproval',
        args: [account, BALANCER_RELAYER[chainId], true],
    });
};
/******************************************************************************/