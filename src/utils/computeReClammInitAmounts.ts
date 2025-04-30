import { computeInitialBalanceRatio } from '@balancer-labs/balancer-maths';

import { InputAmount } from '@/types';
import { MinimalTokenWithRate } from '@/data/types';
import { getSortedTokens } from '@/entities/utils/getSortedTokens';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { TokenAmountWithRate } from '@/entities/tokenAmountWithRate';
import { isSameAddress } from './helpers';
import { MathSol, WAD } from './math';
import { PublicWalletClient } from '@/utils';
import { type Address, parseAbi } from 'viem';

export type ComputeReClammInitAmountInput = {
    chainId: number;
    client: PublicWalletClient;
    poolAddress: Address;
    tokens: MinimalTokenWithRate[];
    referenceAmountIn: InputAmount;
    initialMinPrice: bigint;
    initialMaxPrice: bigint;
    initialTargetPrice: bigint;
};

export async function computeReClammInitAmounts({
    chainId,
    client,
    poolAddress,
    tokens,
    referenceAmountIn,
    initialMinPrice,
    initialMaxPrice,
    initialTargetPrice,
}: ComputeReClammInitAmountInput): Promise<InputAmount[]> {
    // sort the user provided tokens just in case
    const sortedTokens = getSortedTokens(tokens, chainId);
    const givenTokenIndex = sortedTokens.findIndex((t) =>
        isSameAddress(t.address, referenceAmountIn.address),
    );
    const calculatedTokenIndex = givenTokenIndex === 0 ? 1 : 0;

    const proportion = computeInitialBalanceRatio(
        initialMinPrice,
        initialMaxPrice,
        initialTargetPrice,
    );

    const referenceToken = new Token(
        chainId,
        referenceAmountIn.address,
        referenceAmountIn.decimals,
        undefined, // symbol
        undefined, // name
        undefined, // wrapped
        sortedTokens[givenTokenIndex]?.rate,
    );
    const computedToken = new Token(
        chainId,
        sortedTokens[calculatedTokenIndex].address,
        sortedTokens[calculatedTokenIndex].decimals,
        undefined, // symbol
        undefined, // name
        undefined, // wrapped
        sortedTokens[calculatedTokenIndex]?.rate,
    );

    // Scale given amount to 18 decimals before doing math
    const referenceTokenAmount = referenceToken.rate
        ? TokenAmountWithRate.fromRawAmountWithRate(
              referenceToken,
              referenceAmountIn.rawAmount,
              referenceToken.rate,
          )
        : TokenAmount.fromRawAmount(
              referenceToken,
              referenceAmountIn.rawAmount,
          );

    console.log('referenceTokenAmount.scale18', referenceTokenAmount.scale18);

    // Do math based on token order: https://github.com/balancer/reclamm/blob/8207b33c1ab76de3c42b015bab5210a8436376de/test/reClammPool.test.ts#L120-L128
    const computedAmountScaled18 =
        givenTokenIndex === 0
            ? MathSol.mulDownFixed(referenceTokenAmount.scale18, proportion) // if given token is first in sort order, we multiply
            : MathSol.divDownFixed(referenceTokenAmount.scale18, proportion); // if given token is second in sort order, we divide'

    console.log('computedAmountScaled18', computedAmountScaled18);

    // Convert back to native token decimals of the calculated token (rounding down)
    const computedAmountScaledRaw = computedToken.rate
        ? // TODO: this is broken, how to fix so tokens scaled 18 are scaled down by rate?
          TokenAmountWithRate.fromScale18AmountWithRate(
              computedToken,
              computedAmountScaled18,
              computedToken.rate,
          )
        : TokenAmount.fromScale18Amount(computedToken, computedAmountScaled18);

    console.log('computedToken.rate', computedToken.rate);
    console.log('computedAmountScaledRaw', computedAmountScaledRaw.amount);

    const computedAmountIn: InputAmount = {
        address: sortedTokens[calculatedTokenIndex].address,
        rawAmount: computedAmountScaledRaw.amount,
        decimals: sortedTokens[calculatedTokenIndex].decimals,
    };

    // on chain sanity check for computedAmountScaled18
    const initialBalances = await client.readContract({
        address: poolAddress,
        abi: parseAbi([
            'function computeInitialBalances(address referenceToken, uint256 referenceAmountIn) view returns (uint256[])',
        ]),
        functionName: 'computeInitialBalances',
        args: [referenceToken.address, referenceTokenAmount.scale18],
    });

    console.log('on chain initialBalances:', initialBalances);

    // TODO: sort token amounts within InitPool.buildCallWithPermit2 so this not needed
    // Return amounts in consistent order based on token addresses
    return [referenceAmountIn, computedAmountIn].sort((a, b) =>
        a.address.localeCompare(b.address),
    );
}
