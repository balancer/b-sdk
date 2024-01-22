// bun run debug/sor.ts
import { parseEther } from 'viem';
import { SmartOrderRouter, SwapKind, Token } from '../src';
import { mainnet } from 'viem/chains';

export const swap = async () => {
    const chainId = mainnet.id;
    const rpcUrl = process.env.ETHEREUM_RPC_URL as string;
    const swapKind = SwapKind.GivenIn;
    const BAL = new Token(
        chainId,
        '0xba100000625a3754423978a60c9317c58a424e3d',
        18,
        'BAL',
    );
    const DAI = new Token(
        chainId,
        '0x6b175474e89094c44da98b954eedeac495271d0f',
        18,
        'DAI',
    );

    const sor = new SmartOrderRouter({
        chainId,
        rpcUrl: rpcUrl,
    });

    const swap = await sor.getSwaps(BAL, DAI, swapKind, parseEther('1000'));

    console.log(swap?.outputAmount.amount);
    console.log(swap?.swaps);
};

export default swap;
