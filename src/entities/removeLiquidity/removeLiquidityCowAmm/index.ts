import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState, PoolStateWithBalances } from '@/entities/types';
import {
    calculateProportionalAmounts,
    getSortedTokens,
} from '@/entities/utils';
import { CHAINS } from '@/utils';

import { getAmountsCall, getAmountsQuery } from '../helper';
import {
    RemoveLiquidityBase,
    RemoveLiquidityBaseBuildCallInput,
    RemoveLiquidityBaseQueryOutput,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityKind,
    RemoveLiquidityProportionalInput,
} from '../types';
import {
    createPublicClient,
    encodeFunctionData,
    formatEther,
    formatUnits,
    http,
} from 'viem';
import { HumanAmount } from '@/data';
import {
    getPoolTokenBalanceCowAmm,
    getTotalSupplyCowAmm,
} from '@/entities/utils/cowAmmHelpers';
import { cowAmmPoolAbi } from '@/abi/cowAmmPool';

export class RemoveLiquidityCowAmm implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityProportionalInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityBaseQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = getAmountsQuery(sortedTokens, input);

        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainId],
        });

        const balances: bigint[] = [];
        for (const token of sortedTokens) {
            balances.push(
                await getPoolTokenBalanceCowAmm(
                    poolState.id,
                    token.address,
                    client,
                ),
            );
        }

        const totalShares = await getTotalSupplyCowAmm(
            poolState.address,
            client,
        );

        const poolStateWithBalances: PoolStateWithBalances = {
            ...poolState,
            tokens: sortedTokens.map((token, i) => ({
                address: token.address,
                decimals: token.decimals,
                index: i,
                balance: formatUnits(
                    balances[i],
                    token.decimals,
                ) as HumanAmount,
            })),
            totalShares: formatEther(totalShares) as HumanAmount,
        };

        const { tokenAmounts, bptAmount } = calculateProportionalAmounts(
            poolStateWithBalances,
            input.bptIn,
        );
        const bptIn = TokenAmount.fromRawAmount(
            new Token(input.chainId, bptAmount.address, bptAmount.decimals),
            bptAmount.rawAmount,
        );
        const amountsOut = tokenAmounts.map((amountIn) =>
            TokenAmount.fromRawAmount(
                new Token(input.chainId, amountIn.address, amountIn.decimals),
                amountIn.rawAmount,
            ),
        );

        const output: RemoveLiquidityBaseQueryOutput = {
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex: amounts.tokenOutIndex,
            vaultVersion: poolState.vaultVersion,
            chainId: input.chainId,
        };

        return output;
    }

    public queryRemoveLiquidityRecovery(): never {
        throw new Error(
            'Remove Liquidity Recovery is not supported for Cow AMM pools',
        );
    }

    public buildCall(
        input: RemoveLiquidityBaseBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        if (input.removeLiquidityKind !== RemoveLiquidityKind.Proportional) {
            throw new Error(
                `Error: Remove Liquidity ${input.removeLiquidityKind} is not supported. Cow AMM pools support Remove Liquidity Proportional only.`,
            );
        }

        const amounts = getAmountsCall(input);

        const callData = encodeFunctionData({
            abi: cowAmmPoolAbi,
            functionName: 'exitPool',
            args: [amounts.maxBptAmountIn, amounts.minAmountsOut],
        });

        return {
            callData,
            to: input.poolId,
            value: 0n, // remove liquidity always has value = 0
            maxBptIn: TokenAmount.fromRawAmount(
                input.bptIn.token,
                amounts.maxBptAmountIn,
            ),
            minAmountsOut: input.amountsOut.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.minAmountsOut[i]),
            ),
        };
    }
}
