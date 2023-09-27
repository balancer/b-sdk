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
import { Relayer } from '../src/entities/relayer';

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

        // Fork setup - done only once per fork reset
        // Governance grant roles to the relayer
        await grantRoles(client);

        // User approve vault to spend their tokens
        const dai = '0x6b175474e89094c44da98b954eedeac495271d0f' as Address;
        await approveToken(client, testAddress, dai, parseUnits('1000', 18));

        // Update user balance
        await setTokenBalance(
            client,
            testAddress,
            dai,
            2,
            parseUnits('1000', 18),
        );

        poolId =
            '0xbe19d87ea6cd5b05bbc34b564291c371dae967470000000000000000000005c4'; // GHO-3POOL-BPT
    });

    beforeEach(async () => {
        // get pool state from api
        nestedPoolFromApi = await api.getNestedPool(getPoolAddress(poolId));

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

        const signature = await Relayer.signRelayerApproval(
            BALANCER_RELAYER,
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

        const tokensIn = joinInput.amountsIn.map((a) => a.address);

        // send join transaction and check balance changes
        const { transactionReceipt, balanceDeltas } =
            await sendTransactionGetBalances(
                [...tokensIn, queryResult.bptOut.token.address],
                client,
                testAddress,
                to,
                call,
                value,
            );

        expect(transactionReceipt.status).to.eq('success');
        expect(queryResult.bptOut.amount > 0n).to.be.true;
        const expectedDeltas = [
            ...joinInput.amountsIn.map((a) => a.rawAmount),
            queryResult.bptOut.amount,
        ];
        expect(expectedDeltas).to.deep.eq(balanceDeltas);
        const expectedMinBpt = slippage.removeFrom(queryResult.bptOut.amount);
        expect(expectedMinBpt).to.deep.eq(minBptOut);
    });
});

/*********************** Mock To Represent API Requirements **********************/

export class MockApi {
    public async getNestedPool(address: Address): Promise<NestedPoolState> {
        if (address !== '0xbe19d87ea6cd5b05bbc34b564291c371dae96747')
            throw Error();
        const pools: { id: Hex; address: Address; type: string }[] = [
            {
                id: '0xbe19d87ea6cd5b05bbc34b564291c371dae967470000000000000000000005c4',
                address: '0xbe19d87ea6cd5b05bbc34b564291c371dae96747',
                type: 'ComposableStable',
            },
            {
                id: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
                address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc',
                type: 'ComposableStable',
            },
        ];
        const joinSteps: JoinStep[] = [
            {
                action: 'join',
                input: {
                    address: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
                    decimals: 18,
                    index: 0,
                },
                level: 0,
                poolId: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
                isTop: false,
            },
            {
                action: 'join',
                input: {
                    address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc', // 3POOL-BPT
                    decimals: 18,
                    index: 1,
                },
                level: 0,
                poolId: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
                isTop: false,
            },
            {
                action: 'join',
                input: {
                    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
                    decimals: 6,
                    index: 2,
                },
                level: 0,
                poolId: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
                isTop: false,
            },
            {
                action: 'join',
                input: {
                    address: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
                    decimals: 6,
                    index: 3,
                },
                level: 0,
                poolId: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
                isTop: false,
            },
            {
                action: 'join',
                input: {
                    address: '0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f', // GHO
                    decimals: 18,
                    index: 0,
                },
                level: 1,
                poolId: '0xbe19d87ea6cd5b05bbc34b564291c371dae967470000000000000000000005c4',
                isTop: true,
            },
            {
                action: 'join',
                input: {
                    address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc', // 3POOL-BPT
                    decimals: 18,
                    index: 1,
                },
                level: 1,
                poolId: '0xbe19d87ea6cd5b05bbc34b564291c371dae967470000000000000000000005c4',
                isTop: true,
            },
            {
                action: 'join',
                input: {
                    address: '0xbe19d87ea6cd5b05bbc34b564291c371dae96747', // GHO-3POOL-BPT
                    decimals: 18,
                    index: 2,
                },
                level: 1,
                poolId: '0xbe19d87ea6cd5b05bbc34b564291c371dae967470000000000000000000005c4',
                isTop: true,
            },
        ];
        return {
            pools,
            joinSteps,
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
    for (const role of roles) {
        await client.writeContract({
            account: balancerDaoAddress,
            address: authorizerAddress,
            chain: client.chain,
            abi: authorizerAbi,
            functionName: 'grantRole',
            args: [role, BALANCER_RELAYER],
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
    await client.writeContract({
        account,
        address: BALANCER_VAULT,
        chain: client.chain,
        abi: vaultAbi,
        functionName: 'setRelayerApproval',
        args: [account, BALANCER_RELAYER, true],
    });
};

/******************************************************************************/
