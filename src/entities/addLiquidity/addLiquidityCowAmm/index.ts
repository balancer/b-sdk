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
} from '@/entities/utils';
import { CHAINS } from '@/utils';

import { getAmountsCall } from '../helpers';
import {
    AddLiquidityBase,
    AddLiquidityBaseBuildCallInput,
    AddLiquidityBaseQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityKind,
    AddLiquidityProportionalInput,
} from '../types';
import {
    getPoolTokenBalanceCowAmm,
    getTotalSupplyCowAmm,
} from '../../utils/cowAmmHelpers';

export class AddLiquidityCowAmm implements AddLiquidityBase {
    async query(
        input: AddLiquidityProportionalInput,
        poolState: PoolState,
    ): Promise<AddLiquidityBaseQueryOutput> {
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
        if (input.addLiquidityKind !== AddLiquidityKind.Proportional) {
            throw new Error(
                `Error: Add Liquidity ${input.addLiquidityKind} is not supported. Cow AMM pools support Add Liquidity Proportional only.`,
            );
        }
        if (input.wethIsEth) {
            throw new Error(
                'Cow AMM pools do not support adding liquidity with ETH.',
            );
        }

        const amounts = getAmountsCall(input);
        const callData = encodeFunctionData({
            abi: cowAmmPoolAbi,
            functionName: 'joinPool',
            args: [amounts.minimumBpt, amounts.maxAmountsInWithoutBpt],
        });

        return {
            callData,
            to: input.poolId,
            value: 0n,
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
