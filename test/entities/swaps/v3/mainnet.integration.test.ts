// pnpm test ./test/entities/swaps/v3/mainnet.integration.test.ts
import { config } from 'dotenv';
config();
import {
    Address,
    createTestClient,
    http,
    publicActions,
    walletActions,
    TestActions,
    Hex,
} from 'viem';
import {
    CHAINS,
    ChainId,
    SwapKind,
    Swap,
    PERMIT2,
    PublicWalletClient,
} from '@/index';
import { Path } from '@/entities/swap/paths/types';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';

import {
    approveSpenderOnTokens,
    getErc20Balance,
    setTokenBalances,
} from 'test/lib/utils/helper';
import { ANVIL_NETWORKS, startFork } from 'test/anvil/anvil-global-setup';
import { TOKENS } from 'test/lib/utils/addresses';
import { assertSwapExactIn } from 'test/lib/utils/swapHelpers';

const protocolVersion = 3;
const chainId = ChainId.MAINNET;

const eigen = TOKENS[chainId].eigen;
const weth = TOKENS[chainId].WETH;

describe('SwapV3', () => {
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let rpcUrl: string;
    let snapshot: Hex;
    let pathWethEigen: Path;
    let tokens: Address[];

    beforeAll(async () => {
        pathWethEigen = {
            protocolVersion,
            tokens: [
                {
                    address: weth.address,
                    decimals: weth.decimals,
                },
                {
                    address: eigen.address,
                    decimals: eigen.decimals,
                },
            ],
            pools: ['0xbda917a67c7d9ae67da92c4ea87e10e5d6c11b54'], // https://balancer.fi/pools/ethereum/v3/0xbda917a67c7d9ae67da92c4ea87e10e5d6c11b54
            inputAmountRaw: 10000000000000000n,
            outputAmountRaw: 100000000000000n,
        };

        const fork = await startFork(ANVIL_NETWORKS.MAINNET, 77, 23933280n);
        rpcUrl = fork.rpcUrl;
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];

        tokens = [weth.address];

        await setTokenBalances(
            client,
            testAddress,
            tokens,
            [weth.slot] as number[],
            [10000000000000000n],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            tokens,
            PERMIT2[chainId],
            [10000000000000000n],
        );

        const balance = await getErc20Balance(
            weth.address,
            client,
            testAddress,
        );
        console.log('balance', balance);

        // Uses Special RPC methods to revert state back to same snapshot for each test
        // https://github.com/trufflesuite/ganache-cli-archive/blob/master/README.md
        snapshot = await client.snapshot();
    });

    beforeEach(async () => {
        await client.revert({
            id: snapshot,
        });
        snapshot = await client.snapshot();
    });

    describe('permit2 signatures', () => {
        const usePermit2Signatures = true;
        describe('single swap', () => {
            describe('swap should be executed correctly', () => {
                describe('wethIsEth: false', () => {
                    test('GivenIn', async () => {
                        const swap = new Swap({
                            chainId,
                            paths: [pathWethEigen],
                            swapKind: SwapKind.GivenIn,
                        });
                        await assertSwapExactIn({
                            contractToCall: AddressProvider.Router(chainId),
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
    });
});
