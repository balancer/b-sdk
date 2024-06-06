import {
    createPublicClient,
    encodeFunctionData,
    formatEther,
    formatUnits,
    http,
} from 'viem';
import { cowAmmPoolAbi } from '@/abi/cowAmmPool';
import { HumanAmount } from '@/data';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState, PoolStateWithBalances } from '@/entities/types';
import {
    calculateProportionalAmounts,
    getSortedTokens,
    getValue,
} from '@/entities/utils';
import { CHAINS } from '@/utils';

import { getAmountsCall } from '../helpers';
import {
    AddLiquidityBase,
    AddLiquidityBaseBuildCallInput,
    AddLiquidityBaseQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityInput,
    AddLiquidityKind,
} from '../types';
import { getPoolTokenBalanceCowAmm, getTotalSupplyCowAmm } from './helpers';

export class AddLiquidityCowAmm implements AddLiquidityBase {
    async query(
        input: AddLiquidityInput,
        poolState: PoolState,
    ): Promise<AddLiquidityBaseQueryOutput> {
        if (input.kind !== AddLiquidityKind.Proportional) {
            throw new Error(
                `Error: Add Liquidity ${input.kind} is not supported. Cow AMM pools support Add Liquidity Proportional only.`,
            );
        }

        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);

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
            input.bptOut,
        );
        const bptOut = TokenAmount.fromRawAmount(
            new Token(input.chainId, bptAmount.address, bptAmount.decimals),
            bptAmount.rawAmount,
        );
        const amountsIn = tokenAmounts.map((amountIn) =>
            TokenAmount.fromRawAmount(
                new Token(input.chainId, amountIn.address, amountIn.decimals),
                amountIn.rawAmount,
            ),
        );
        const tokenInIndex = undefined;

        const output: AddLiquidityBaseQueryOutput = {
            poolType: poolStateWithBalances.type,
            poolId: poolStateWithBalances.id,
            addLiquidityKind: input.kind,
            bptOut,
            amountsIn,
            tokenInIndex,
            chainId: input.chainId,
            vaultVersion: 0,
        };

        return output;
    }

    buildCall(
        input: AddLiquidityBaseBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);
        const callData = encodeFunctionData({
            abi: cowAmmPoolAbi,
            functionName: 'joinPool',
            args: [input.bptOut.amount, input.amountsIn.map((a) => a.amount)],
        });

        return {
            callData,
            to: input.poolId,
            value: getValue(input.amountsIn, !!input.wethIsEth),
            minBptOut: TokenAmount.fromRawAmount(
                input.bptOut.token,
                amounts.minimumBpt,
            ),
            maxAmountsIn: input.amountsIn.map((a, i) =>
                TokenAmount.fromRawAmount(a.token, amounts.maxAmountsIn[i]),
            ),
        };
    }
}
