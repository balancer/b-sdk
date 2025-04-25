// pnpm test -- swapV3.liquiditybootstrapping.integration.test.ts
import { config } from 'dotenv';
config();
import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    TestActions,
    Hex,
} from 'viem';
import {
    CHAINS,
    ChainId,
    Swap,
    balancerV3Contracts,
    PERMIT2,
    PublicWalletClient,
} from '@/index';

import {
    approveSpenderOnTokens,
    setTokenBalances,
} from 'test/lib/utils/helper';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { TOKENS } from 'test/lib/utils/addresses';
import { assertSwapExactIn } from 'test/lib/utils/swapHelpers';

const chainId = ChainId.SEPOLIA;

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;
const DAI = TOKENS[chainId].DAI;

describe('SwapV3LiquidityBootstrapping', () => {
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let rpcUrl: string;
    let snapshot: Hex;
    let swap: Swap;

    let tokens: Address[];

    beforeAll(async () => {
        const fork = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            8085514n, //swaps are allowed on this block
        );
        rpcUrl = fork.rpcUrl;
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        tokens = [WETH.address, BAL.address, DAI.address];

        await setTokenBalances(
            client,
            testAddress,
            tokens,
            [WETH.slot, BAL.slot, DAI.slot] as number[],
            [parseEther('100'), parseEther('100'), 100000000000n],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            tokens,
            PERMIT2[chainId],
        );

        // Uses Special RPC methods to revert state back to same snapshot for each test
        // https://github.com/trufflesuite/ganache-cli-archive/blob/master/README.md
        snapshot = await client.snapshot();

        swap = new Swap({
            chainId: 11155111, // Sepolia chain ID
            paths: [
                {
                    protocolVersion: 3,
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
                    pools: ['0x8E4Bd90c02b612594C96a31fADD7E4957bd5daBb'],
                    inputAmountRaw: 10000000n,
                    outputAmountRaw: 0n,
                    isBuffer: [false],
                },
            ],
            swapKind: 0, // SwapKind.GivenIn
        });
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    describe('LBP', () => {
        test('can query swap', async () => {
            const queryOutput = await swap.query(rpcUrl);
            expect(queryOutput).toBeDefined();
        });
        describe('can swap', async () => {
            test('GivenIn', async () => {
                const usePermit2Signatures = true;
                await assertSwapExactIn({
                    contractToCall: balancerV3Contracts.Router[chainId],
                    client,
                    rpcUrl,
                    chainId,
                    swap,
                    wethIsEth: false,
                    usePermit2Signatures,
                });
            });
        });
    });
});
