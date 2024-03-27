import { ChainId } from '@/utils';
import { TOKENS } from 'test/lib/utils';
import { Address } from 'viem';

export function getSlot(chainId: ChainId, tokenAddress: Address): number {
    const tokens = Object.values(TOKENS[chainId]);
    const token = tokens.find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
    );
    if (!token)
        throw new Error(
            `TOKENS does not contain token ${tokenAddress} ${chainId}`,
        );
    if (!token.slot)
        throw new Error(
            `TOKENS does not contain slot for token ${tokenAddress} ${chainId}`,
        );
    return token.slot;
}

function test() {
    const slot = getSlot(
        ChainId.MAINNET,
        '0xba100000625a3754423978a60c9317c58a424e3D',
    );
    console.log(slot);
}
test();

// examples/lib/getSlot.ts
