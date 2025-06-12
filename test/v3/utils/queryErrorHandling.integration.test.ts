// pnpm test test/v3/utils/queryErrorHandling.integration.test.ts

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    createTestClient,
    Hex,
    http,
    parseUnits,
    publicActions,
    TestActions,
    walletActions,
    zeroAddress,
} from 'viem';
import {
    Address,
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED,
    CHAINS,
    ChainId,
    PERMIT2,
    PublicWalletClient,
    Slippage,
    Token,
    TokenAmount,
    AddLiquidityNested,
    AddLiquidityNestedInput,
    AddLiquidityNestedQueryOutputV3,
    AddLiquidityNestedCallInput,
    SDKError,
    Swap,
    SwapInput,
    SwapKind,
} from '@/index';

const chainId = ChainId.SEPOLIA;

describe('query propagates LBP specific errors', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;

    beforeAll(async () => {
        // set up chain and test client
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            8467070n,
        ));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];
    });

    beforeEach(() => {
        // nothing needed
    });

    test('Query propagates LBP specific errors', async () => {
        // Assuming the ABIs are correctly part of the used ABIS
        // one test for an LBP error suffices to ensure
        // all LBP errors are surfaced

        const sampleSwapInput: SwapInput = {
            chainId: chainId,
            paths: [
                {
                    pools: ['0x8E4Bd90c02b612594C96a31fADD7E4957bd5daBb'],
                    tokens: [
                        {
                            address:
                                '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                            decimals: 18,
                        },
                        {
                            address:
                                '0xB77EB1A70A96fDAAeB31DB1b42F2b8b5846b2613',
                            decimals: 18,
                        },
                    ],
                    inputAmountRaw: 10000000n,
                    outputAmountRaw: 10000000n,
                    protocolVersion: 3,
                },
            ],
            swapKind: SwapKind.GivenIn,
        };
        const swap = new Swap(sampleSwapInput);
        // this should fail
        await expect(
            swap.query(rpcUrl, 8467070n, testAddress),
        ).rejects.toThrowError('SwapsDisabled');
    });
});
