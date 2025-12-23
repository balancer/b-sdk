// pnpm test test/v3/utils/queryErrorHandling.integration.test.ts

import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import {
    createTestClient,
    http,
    publicActions,
    TestActions,
    walletActions,
} from 'viem';
import {
    Address,
    CHAINS,
    ChainId,
    PublicWalletClient,
    AddLiquidity,
    Swap,
    SwapInput,
    SwapKind,
    AddLiquidityUnbalancedInput,
    AddLiquidityBaseInput,
    AddLiquidityKind,
    PoolState,
} from '@/index';

import { generateJobId } from 'test/lib/utils';
import { fileURLToPath } from 'node:url';

const chainId = ChainId.SEPOLIA;

// Get the directory of the current test file
const __filename = fileURLToPath(import.meta.url);

const jobId = generateJobId(__filename);

describe('query propagates LBP specific errors', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;

    beforeAll(async () => {
        // set up chain and test client
        ({ rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA, jobId, 8467070n));

        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];
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
    test('Query propagates MaxInAmountOut error', async () => {
        const sampleSwapInput: SwapInput = {
            chainId: chainId,
            paths: [
                {
                    pools: ['0x52c5b95c675514ff5b2470161efafc0c672cf353'],
                    tokens: [
                        {
                            address:
                                '0x0f409E839a6A790aecB737E4436293Be11717f95',
                            decimals: 18,
                        },
                        {
                            address:
                                '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                            decimals: 18,
                        },
                    ],
                    inputAmountRaw: 1000000000000000000n,
                    outputAmountRaw: 0n,
                    protocolVersion: 3,
                },
            ],
            swapKind: SwapKind.GivenIn,
        };
        const swap = new Swap(sampleSwapInput);
        // this should fail
        await expect(swap.query(rpcUrl)).rejects.toThrowError('MaxInRatio');
    });
    test('Query propagates MaxInvariantRatio for an AddLiquidity', async () => {
        const addLiquidity = new AddLiquidity();
        const addLiquidityBaseInput: AddLiquidityBaseInput = {
            chainId: chainId,
            rpcUrl: rpcUrl,
            sender: testAddress,
        };
        const addLiquidityInput: AddLiquidityUnbalancedInput = {
            ...addLiquidityBaseInput,
            kind: AddLiquidityKind.Unbalanced,
            amountsIn: [
                {
                    address: '0x0f409E839a6A790aecB737E4436293Be11717f95',
                    decimals: 18,
                    rawAmount: 100000000000000000000n,
                },
                {
                    address: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                    decimals: 18,
                    rawAmount: 100000000000000000000n,
                },
            ],
        };
        const poolState: PoolState = {
            id: '0x52c5b95c675514ff5b2470161efafc0c672cf353',
            address: '0x52c5b95c675514ff5b2470161efafc0c672cf353',
            type: 'WEIGHTED',
            tokens: [
                {
                    address: '0x0f409E839a6A790aecB737E4436293Be11717f95',
                    decimals: 18,
                    index: 0,
                },
                {
                    address: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                    decimals: 18,
                    index: 1,
                },
            ],
            protocolVersion: 3,
        };

        await expect(
            addLiquidity.query(addLiquidityInput, poolState),
        ).rejects.toThrowError('InvariantRatioAboveMax');
    });
});
