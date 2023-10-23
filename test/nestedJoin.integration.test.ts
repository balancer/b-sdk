// pnpm test -- nestedJoin.integration.test.ts
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
    TransactionReceipt,
    WalletActions,
    walletActions,
} from 'viem';

import {
    Slippage,
    NestedJoin,
    replaceWrapped,
    NestedPoolState,
    TokenAmount,
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
    sendTransactionGetBalances,
    setTokenBalance,
} from './lib/utils/helper';
import { authorizerAbi, vaultAbi } from '../src/abi';
import { Relayer } from '../src/entities/relayer';
import { NestedJoinInput } from '../src/entities/nestedJoin/types';

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
    poolAddress: Address;
    amountsIn: {
        address: Address; // DAI
        rawAmount: bigint;
    }[];
    chainId: ChainId;
    rpcUrl: string;
    testAddress: Address;
    client: Client & PublicActions & TestActions & WalletActions;
    useNativeAssetAsWrappedAmountIn?: boolean;
};

describe('nested join test', () => {
    let chainId: ChainId;
    let rpcUrl: string;
    let client: Client & PublicActions & TestActions & WalletActions;
    let poolAddress: Address;
    let testAddress: Address;

    beforeAll(async () => {
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

        // Fork setup - done only once per fork reset
        // Governance grant roles to the relayer
        await grantRoles(client);

        // User approve vault to spend their tokens and update user balance
        const mainTokens = [
            {
                address:
                    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
                balance: parseUnits('1000', 18),
                slot: 3,
            },
            {
                address:
                    '0x6b175474e89094c44da98b954eedeac495271d0f' as Address, // DAI
                balance: parseUnits('1000', 18),
                slot: 2,
            },
            {
                address:
                    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Address, // USDC
                balance: parseUnits('1000', 6),
                slot: 9,
            },
            {
                address:
                    '0xdac17f958d2ee523a2206206994597c13d831ec7' as Address, // USDT
                balance: parseUnits('1000', 6),
                slot: 2,
            },
        ];

        for (const token of mainTokens) {
            await approveToken(client, testAddress, token.address);
            await setTokenBalance(
                client,
                testAddress,
                token.address,
                token.slot,
                token.balance,
            );
        }
    });

    test('single asset join', async () => {
        const amountsIn = [
            {
                address:
                    '0x6b175474e89094c44da98b954eedeac495271d0f' as Address, // DAI
                rawAmount: parseUnits('1', 18),
            },
        ];

        const {
            transactionReceipt,
            balanceDeltas,
            bptOut,
            minBptOut,
            slippage,
            value,
        } = await doTransaction({
            poolAddress,
            amountsIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
        });

        assertResults(
            transactionReceipt,
            bptOut,
            amountsIn,
            balanceDeltas,
            slippage,
            minBptOut,
            value,
        );
    });

    test('all assets join', async () => {
        const amountsIn = [
            {
                address:
                    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
                rawAmount: parseUnits('1', 18),
            },
            {
                address:
                    '0x6b175474e89094c44da98b954eedeac495271d0f' as Address, // DAI
                rawAmount: parseUnits('1', 18),
            },
            {
                address:
                    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Address, // USDC
                rawAmount: parseUnits('1', 6),
            },
            {
                address:
                    '0xdac17f958d2ee523a2206206994597c13d831ec7' as Address, // USDT
                rawAmount: parseUnits('1', 6),
            },
        ];

        const {
            transactionReceipt,
            balanceDeltas,
            bptOut,
            minBptOut,
            slippage,
            value,
        } = await doTransaction({
            poolAddress,
            amountsIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
        });

        assertResults(
            transactionReceipt,
            bptOut,
            amountsIn,
            balanceDeltas,
            slippage,
            minBptOut,
            value,
        );
    });

    test('native asset join', async () => {
        const amountsIn = [
            {
                address:
                    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' as Address, // WETH
                rawAmount: parseUnits('1', 18),
            },
            {
                address:
                    '0x6b175474e89094c44da98b954eedeac495271d0f' as Address, // DAI
                rawAmount: parseUnits('1', 18),
            },
            {
                address:
                    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Address, // USDC
                rawAmount: parseUnits('1', 6),
            },
            {
                address:
                    '0xdac17f958d2ee523a2206206994597c13d831ec7' as Address, // USDT
                rawAmount: parseUnits('1', 6),
            },
        ];

        const useNativeAssetAsWrappedAmountIn = true;

        const {
            transactionReceipt,
            balanceDeltas,
            bptOut,
            minBptOut,
            slippage,
            value,
        } = await doTransaction({
            poolAddress,
            amountsIn,
            chainId,
            rpcUrl,
            testAddress,
            client,
            useNativeAssetAsWrappedAmountIn,
        });

        assertResults(
            transactionReceipt,
            bptOut,
            amountsIn,
            balanceDeltas,
            slippage,
            minBptOut,
            value,
            useNativeAssetAsWrappedAmountIn,
        );
    });
});

export const doTransaction = async ({
    poolAddress,
    amountsIn,
    chainId,
    rpcUrl,
    testAddress,
    client,
    useNativeAssetAsWrappedAmountIn = false,
}: TxInput) => {
    // setup mock api
    const api = new MockApi();
    // get pool state from api
    const nestedPoolFromApi = await api.getNestedPool(poolAddress);
    // setup join helper
    const nestedJoin = new NestedJoin();

    const joinInput: NestedJoinInput = {
        amountsIn,
        chainId,
        rpcUrl,
        accountAddress: testAddress,
        useNativeAssetAsWrappedAmountIn,
    };
    const queryResult = await nestedJoin.query(joinInput, nestedPoolFromApi);

    // build join call with expected minBpOut based on slippage
    const slippage = Slippage.fromPercentage('1'); // 1%

    const signature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        testAddress,
        client,
    );

    const { call, to, value, minBptOut } = nestedJoin.buildCall({
        ...queryResult,
        slippage,
        sender: testAddress,
        recipient: testAddress,
        relayerApprovalSignature: signature,
    });

    let tokensIn = queryResult.amountsIn.map((a) => a.token);
    if (useNativeAssetAsWrappedAmountIn) {
        tokensIn = replaceWrapped(tokensIn, chainId);
    }

    // send join transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                ...tokensIn.map((t) => t.address),
                queryResult.bptOut.token.address,
            ],
            client,
            testAddress,
            to,
            call,
            value,
        );
    return {
        transactionReceipt,
        balanceDeltas,
        bptOut: queryResult.bptOut,
        minBptOut,
        slippage,
        value,
    };
};

const assertResults = (
    transactionReceipt: TransactionReceipt,
    bptOut: TokenAmount,
    amountsIn: {
        address: Address;
        rawAmount: bigint;
    }[],
    balanceDeltas: bigint[],
    slippage: Slippage,
    minBptOut: bigint,
    value?: bigint,
    useNativeAssetAsWrappedAmountIn = false,
) => {
    expect(transactionReceipt.status).to.eq('success');
    expect(bptOut.amount > 0n).to.be.true;
    const expectedDeltas = [
        ...amountsIn.map((a) => a.rawAmount),
        bptOut.amount,
    ];
    expect(expectedDeltas).to.deep.eq(balanceDeltas);
    const expectedMinBpt = slippage.removeFrom(bptOut.amount);
    expect(expectedMinBpt).to.deep.eq(minBptOut);

    const weth = amountsIn.find(
        (a) => a.address === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    );
    if (weth && useNativeAssetAsWrappedAmountIn) {
        expect(value).to.eq(weth.rawAmount);
    } else {
        expect(value).to.eq(undefined || 0n);
    }
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
            mainTokens: [
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
                    decimals: 18,
                },
                {
                    address: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
                    decimals: 18,
                },
                {
                    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
                    decimals: 6,
                },
                {
                    address: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
                    decimals: 6,
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
