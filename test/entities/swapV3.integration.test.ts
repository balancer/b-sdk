// pnpm test -- swapV3.integration.test.ts
import { config } from 'dotenv';
config();
import {
    Address,
    createTestClient,
    http,
    parseEther,
    publicActions,
    walletActions,
    Client,
    PublicActions,
    TestActions,
    WalletActions,
} from 'viem';
import { CHAINS, ChainId, SwapKind, Path, Token } from '../../src';
import { forkSetup } from '../lib/utils/helper';
import { ANVIL_NETWORKS, startFork } from '../anvil/anvil-global-setup';
import { TOKENS } from 'test/lib/utils/addresses';
import { SwapV3 } from '@/entities/swap/swapV3';

const balancerVersion = 3;
const chainId = ChainId.SEPOLIA;

const { rpcUrl } = await startFork(ANVIL_NETWORKS.SEPOLIA, undefined, 5287755n);

const BAL = TOKENS[chainId].BAL;
const WETH = TOKENS[chainId].WETH;

describe('SwapV3', () => {
    let client: Client & PublicActions & TestActions & WalletActions;
    let testAddress: Address;
    const pathBalWeth: Path = {
        balancerVersion: 3,
        tokens: [
            {
                address: TOKENS[chainId].BAL.address,
                decimals: TOKENS[chainId].BAL.decimals,
            },
            {
                address: TOKENS[chainId].WETH.address,
                decimals: TOKENS[chainId].WETH.decimals,
            },
        ],
        pools: ['0xB7FdEa33364Da24d6ad01C98EFAb7b539B917A83'],
        inputAmountRaw: 1n,
        outputAmountRaw: 1n,
    };

    beforeAll(async () => {
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl),
        })
            .extend(publicActions)
            .extend(walletActions);

        testAddress = (await client.getAddresses())[0];
    });

    beforeEach(async () => {
        await forkSetup(
            client,
            testAddress,
            [WETH.address, BAL.address],
            [WETH.slot as number, BAL.slot as number],
            [parseEther('100'), parseEther('100')],
            undefined,
            balancerVersion,
        );
    });

    describe('query method should return updated', () => {
        test('GivenIn', async () => {
            const swap = new SwapV3({
                chainId: ChainId.MAINNET,
                paths: [pathBalWeth],
                swapKind: SwapKind.GivenIn,
                wethIsEth: false,
            });

            const updated = await swap.query(rpcUrl, 5287754n);

            const wethToken = new Token(
                chainId,
                TOKENS[chainId].WETH.address,
                TOKENS[chainId].WETH.decimals,
            );
            expect(updated.token).to.deep.eq(wethToken);
            console.log(updated.amount);
        });
        test.skip('GivenOut', async () => {
            const swap = new SwapV3({
                chainId: ChainId.MAINNET,
                paths: [pathBalWeth],
                swapKind: SwapKind.GivenOut,
                wethIsEth: false,
            });

            const updated = await swap.query(rpcUrl);

            const balToken = new Token(
                chainId,
                TOKENS[chainId].BAL.address,
                TOKENS[chainId].BAL.decimals,
            );
            expect(updated.token).to.deep.eq(balToken);
            console.log(updated.amount);
        });
    });
});
