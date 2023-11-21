// bun run debug/sor.ts
import { SmartOrderRouter, SwapKind, Token } from '../src';
import { optimism } from 'viem/chains';

async function swap() {
    const chainId = optimism.id;
    const rpcUrl = 'https://mainnet.optimism.io';
    const swapKind = SwapKind.GivenIn;
    const tokenIn = new Token(
        chainId,
        '0x4200000000000000000000000000000000000006',
        18,
    );
    const tokenOut = new Token(
        chainId,
        '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
        18,
    );

    const sor = new SmartOrderRouter({
        chainId,
        rpcUrl: rpcUrl,
    });

    const swap = await sor.getSwaps(
        tokenIn,
        tokenOut,
        swapKind,
        '1000000000000000000',
    );

    console.log(swap?.outputAmount.amount);
    console.log(swap?.swaps);
}

swap();
