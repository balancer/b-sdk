import { Token } from '@/entities/token';
import { TokenAmount } from '@/entities/tokenAmount';
import { PoolState } from '@/entities/types';
import {
    calculateProportionalAmountsCowAmm,
    getPoolStateWithBalancesCowAmm,
} from '@/entities/utils';

import { getAmountsCall } from '../helper';
import {
    RemoveLiquidityBase,
    RemoveLiquidityBaseBuildCallInput,
    RemoveLiquidityBaseQueryOutput,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityKind,
    RemoveLiquidityProportionalInput,
} from '../types';
import { encodeFunctionData } from 'viem';
import { cowAmmPoolAbi } from '@/abi/cowAmmPool';
import { buildCallWithPermit2ProtocolVersionError } from '@/utils';

export class RemoveLiquidityCowAmm implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityProportionalInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityBaseQueryOutput> {
        const poolStateWithBalances = await getPoolStateWithBalancesCowAmm(
            poolState,
            input.chainId,
            input.rpcUrl,
        );

        const { tokenAmounts } = calculateProportionalAmountsCowAmm(
            poolStateWithBalances,
            input.bptIn,
        );

        const bptIn = TokenAmount.fromRawAmount(
            new Token(input.chainId, input.bptIn.address, input.bptIn.decimals),
            input.bptIn.rawAmount,
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
            tokenOutIndex: undefined,
            protocolVersion: poolState.protocolVersion,
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

    buildCallWithPermit(): RemoveLiquidityBuildCallOutput {
        throw buildCallWithPermit2ProtocolVersionError;
    }
}
