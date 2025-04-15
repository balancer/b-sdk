import {
    type InputAmount,
    type PoolState,
    type PublicWalletClient,
    fpMulDown,
    fpDivDown,
    isSameAddress,
} from 'src';
import { parseAbi } from 'viem';

export async function calculateReClammInitAmounts({
    client,
    poolState,
    givenAmountIn,
}: {
    client: PublicWalletClient;
    poolState: PoolState;
    givenAmountIn: InputAmount;
}): Promise<InputAmount[]> {
    // fetch proportion value from pool contract
    const proportion = await client.readContract({
        address: poolState.address,
        abi: parseAbi([
            'function computeInitialBalanceRatio() external view returns (uint256 balanceRatio)',
        ]),
        functionName: 'computeInitialBalanceRatio',
        args: [],
    });

    // poolState reads on chain so always has tokens in vault sorted order right?
    const { tokens } = poolState;
    const givenTokenIndex = tokens.findIndex((t) =>
        isSameAddress(t.address, givenAmountIn.address),
    );

    let calculatedAmountIn: InputAmount;

    // https://github.com/balancer/reclamm/blob/8207b33c1ab76de3c42b015bab5210a8436376de/test/reClammPool.test.ts#L120-L128
    if (givenTokenIndex === 0) {
        // if chosen token is first in sort order, we multiply
        calculatedAmountIn = {
            address: tokens[1].address,
            rawAmount: fpMulDown(givenAmountIn.rawAmount, proportion),
            decimals: tokens[1].decimals,
        };
    } else {
        // if chosen token is second in sort order, we divide
        calculatedAmountIn = {
            address: tokens[0].address,
            rawAmount: fpDivDown(givenAmountIn.rawAmount, proportion),
            decimals: tokens[0].decimals,
        };
    }

    // Return amounts in consistent order based on token addresses
    return [givenAmountIn, calculatedAmountIn].sort((a, b) =>
        a.address.localeCompare(b.address),
    );
}
