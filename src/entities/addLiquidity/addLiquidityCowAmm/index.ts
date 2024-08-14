import { encodeFunctionData } from 'viem';
import { cowAmmPoolAbi } from '@/abi/cowAmmPool';
import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import {
    calculateProportionalAmountsCowAmm,
    getPoolStateWithBalancesCowAmm,
} from '@/entities/utils';

import { getAmountsCall } from '../helpers';
import {
    AddLiquidityBase,
    AddLiquidityBaseBuildCallInput,
    AddLiquidityBaseQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityKind,
    AddLiquidityProportionalInput,
} from '../types';

export class AddLiquidityCowAmm implements AddLiquidityBase {
    async query(
        input: AddLiquidityProportionalInput,
        poolState: PoolState,
    ): Promise<AddLiquidityBaseQueryOutput> {
        const poolStateWithBalances = await getPoolStateWithBalancesCowAmm(
            poolState,
            input.chainId,
            input.rpcUrl,
        );

        const { tokenAmounts, bptAmount } = calculateProportionalAmountsCowAmm(
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
            protocolVersion: 1,
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
