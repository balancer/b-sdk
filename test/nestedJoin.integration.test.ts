// pnpm test -- nestedJoin.integration.test.ts
import { describe, expect, test, beforeAll, beforeEach } from 'vitest';
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
    NestedPoolState,
    JoinStep,
    NestedJoin,
    NestedJoinInput,
} from '../src/entities';
import { Address, Hex } from '../src/types';

import {
    BALANCER_RELAYER,
    BALANCER_VAULT,
    CHAINS,
    ChainId,
    getPoolAddress,
} from '../src/utils';

import {
    approveToken,
    sendTransactionGetBalances,
    setTokenBalance,
} from './lib/utils/helper';
import { authorizerAbi, vaultAbi } from '../src/abi';

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

const setApprovalRole =
    '0x7b8a1d293670124924a0f532213753b89db10bde737249d4540e9a03657d1aff';
const authorizerAddress = '0xA331D84eC860Bf466b4CdCcFb4aC09a1B43F3aE6';

describe('nested join test', () => {
    let api: MockApi;
    let chainId: ChainId;
    let rpcUrl: string;
    let client: Client & PublicActions & TestActions & WalletActions;
    let poolId: Hex;
    let nestedPoolFromApi: NestedPoolState;
    let nestedJoin: NestedJoin;
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

        // Relayer needs to be approved by governance - needed just once after deployment
        const balancerDaoAddress =
            '0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f' as Address;
        await client.impersonateAccount({
            address: balancerDaoAddress,
        });
        await client.writeContract({
            account: balancerDaoAddress,
            address: authorizerAddress,
            chain: client.chain,
            abi: authorizerAbi,
            functionName: 'grantRole',
            args: [setApprovalRole, BALANCER_RELAYER],
        });
        await client.stopImpersonatingAccount({
            address: balancerDaoAddress,
        });

        const hasRole = await client.readContract({
            account: testAddress,
            address: authorizerAddress,
            abi: authorizerAbi,
            functionName: 'hasRole',
            args: [setApprovalRole, BALANCER_RELAYER],
        });
        console.log('hasRole', hasRole);

        await client.writeContract({
            account: testAddress,
            address: BALANCER_VAULT,
            chain: client.chain,
            abi: vaultAbi,
            functionName: 'setRelayerApproval',
            args: [testAddress, BALANCER_RELAYER, true],
        });

        const hasApproved = await client.readContract({
            account: testAddress,
            address: BALANCER_VAULT,
            abi: vaultAbi,
            functionName: 'hasApprovedRelayer',
            args: [testAddress, BALANCER_RELAYER],
        });
        console.log('hasApproved', hasApproved);

        poolId =
            '0xbe19d87ea6cd5b05bbc34b564291c371dae967470000000000000000000005c4'; // GHO-3POOL-BPT
    });

    beforeEach(async () => {
        // get pool state from api
        nestedPoolFromApi = await api.getNestedPool(poolId);

        // can't reset fork on this test because it depends on previous
        const dai = '0x6b175474e89094c44da98b954eedeac495271d0f' as Address;
        await approveToken(client, testAddress, dai, parseUnits('1000', 18));
        await setTokenBalance(
            client,
            testAddress,
            dai,
            2,
            parseUnits('1000', 18),
        );

        // setup join helper
        nestedJoin = new NestedJoin();
    });

    test('single asset join', async () => {
        const amountIn = {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f' as Address, // DAI
            rawAmount: parseUnits('1', 18),
        };

        // perform join query to get expected bpt out
        const joinInput: NestedJoinInput = {
            amountsIn: [amountIn],
            chainId,
            rpcUrl,
            useNativeAssetAsWrappedAmountIn: false,
            fromInternalBalance: false,
            testAddress,
        };
        const queryResult = await nestedJoin.query(
            joinInput,
            nestedPoolFromApi,
        );

        // build join call with expected minBpOut based on slippage
        const slippage = Slippage.fromPercentage('1'); // 1%

        // const signature = await Relayer.signRelayerApproval(
        //     relayerAddress,
        //     testAddress,
        //     client,
        // );
        // console.log('signature', signature);

        const { call, to, value, minBptOut } = nestedJoin.buildCall({
            ...queryResult,
            slippage,
            sender: testAddress,
            recipient: testAddress,
        });

        // send join transaction and check balance changes
        const { transactionReceipt, balanceDeltas } =
            await sendTransactionGetBalances(
                [
                    ...queryResult.amountsIn.map((a) => a.token.address),
                    queryResult.bptOut.token.address,
                ],
                client,
                testAddress,
                to,
                call,
                value,
            );

        expect(transactionReceipt.status).to.eq('success');
        expect(queryResult.bptOut.amount > 0n).to.be.true;
        const expectedDeltas = [
            ...queryResult.amountsIn.map((a) => a.amount),
            queryResult.bptOut.amount,
        ];
        expect(expectedDeltas).to.deep.eq(balanceDeltas);
        const expectedMinBpt = slippage.removeFrom(queryResult.bptOut.amount);
        expect(expectedMinBpt).to.deep.eq(minBptOut);
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getNestedPool(id: Hex): Promise<NestedPoolState> {
        let tokens: {
            address: Address;
            decimals: number;
            index: number;
            joinSteps: JoinStep[];
        }[] = [];
        if (
            id ===
            '0xbe19d87ea6cd5b05bbc34b564291c371dae967470000000000000000000005c4' // GHO-3POOL-BPT
        ) {
            tokens = [
                {
                    address: '0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f', // GHO
                    decimals: 18,
                    index: 0,
                    joinSteps: [
                        {
                            action: 'join',
                            level: 1,
                            poolId: '0xbe19d87ea6cd5b05bbc34b564291c371dae967470000000000000000000005c4',
                            isTop: true,
                        },
                    ],
                },
                {
                    address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc', // 3POOL-BPT
                    decimals: 18,
                    index: 1,
                    joinSteps: [
                        {
                            action: 'join',
                            level: 1,
                            poolId: '0xbe19d87ea6cd5b05bbc34b564291c371dae967470000000000000000000005c4',
                            isTop: true,
                        },
                    ],
                },
                {
                    address: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
                    decimals: 18,
                    index: 0,
                    joinSteps: [
                        {
                            action: 'join',
                            level: 0,
                            poolId: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
                            isTop: false,
                        },
                    ],
                },
                {
                    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
                    decimals: 6,
                    index: 2,
                    joinSteps: [
                        {
                            action: 'join',
                            level: 0,
                            poolId: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
                            isTop: false,
                        },
                    ],
                },
                {
                    address: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
                    decimals: 6,
                    index: 3,
                    joinSteps: [
                        {
                            action: 'join',
                            level: 0,
                            poolId: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
                            isTop: false,
                        },
                    ],
                },
            ];
        }
        return {
            id,
            address: getPoolAddress(id) as Address,
            type: 'ComposableStable',
            tokens,
        };
    }
}

/******************************************************************************/