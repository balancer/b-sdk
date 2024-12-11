// pnpm test -- test/v2/createPool/composableStable.integration.test.ts
import {
    Address,
    createTestClient,
    http,
    publicActions,
    walletActions,
    zeroAddress,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    CreatePoolV2ComposableStableInput,
    CreatePoolInput,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../anvil/anvil-global-setup';
import { doCreatePool } from '../../lib/utils/createPoolHelper';
import { CreatePoolTxInput } from '../../lib/utils/types';

describe('Create Composable Stable Pool tests', () => {
    const chainId = ChainId.MAINNET;
    let txInput: CreatePoolTxInput;
    let poolAddress: Address;
    let createPoolComposableStableInput: CreatePoolV2ComposableStableInput;
    let rpcUrl: string;

    beforeAll(async () => {
        // TODO: find out why findEventInReceiptLogs doesn't find the event when blockNumber is updated to 21373640n (this causes test to fail)
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.MAINNET,
            undefined,
            18980070n,
        ));
        const client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }), // FIXME: createPool step takes a long time, so we increase the timeout as a temporary solution
        })
            .extend(publicActions)
            .extend(walletActions);
        const signerAddress = (await client.getAddresses())[0];

        txInput = {
            client,
            testAddress: signerAddress,
            createPoolInput: {} as CreatePoolInput,
        };

        createPoolComposableStableInput = {
            name: 'Test Pool',
            poolType: PoolType.ComposableStable,
            symbol: '50BAL-25WETH-25DAI',
            tokens: [
                {
                    address: '0xba100000625a3754423978a60c9317c58a424e3d',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: BigInt(100),
                },
                {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: BigInt(100),
                },
                {
                    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                    rateProvider: zeroAddress,
                    tokenRateCacheDuration: BigInt(100),
                },
            ],
            amplificationParameter: BigInt(67),
            exemptFromYieldProtocolFeeFlag: false,
            swapFee: '0.01',
            poolOwnerAddress: txInput.testAddress, // Balancer DAO Multisig
            chainId,
            protocolVersion: 2,
        };
    });
    test('Create Composable Stable Pool', async () => {
        poolAddress = await doCreatePool({
            ...txInput,
            createPoolInput: createPoolComposableStableInput,
        });
        expect(poolAddress).to.not.be.undefined;
    });
});
