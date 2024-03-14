import { encodeFunctionData } from 'viem';
import { Token } from '../../../token';
import { TokenAmount } from '../../../tokenAmount';
import { WeightedEncoder } from '../../../encoders/weighted';
import { VAULT, ZERO_ADDRESS } from '../../../../utils/constants';
import { vaultV2Abi } from '../../../../abi';
import { parseRemoveLiquidityArgs } from '../../../utils/parseRemoveLiquidityArgs';
import {
    RemoveLiquidityBase,
    RemoveLiquidityBuildCallOutput,
    RemoveLiquidityInput,
    RemoveLiquidityQueryOutput,
    RemoveLiquidityRecoveryInput,
} from '../../types';
import { PoolState, PoolStateWithBalances } from '../../../types';
import { doRemoveLiquidityQuery } from '../../../utils/doRemoveLiquidityQuery';
import { calculateProportionalAmounts, getSortedTokens } from '../../../utils';
import { getAmountsCall, getAmountsQuery } from '../../helper';
import { RemoveLiquidityV2BaseBuildCallInput } from '../types';

export class RemoveLiquidityWeighted implements RemoveLiquidityBase {
    public async query(
        input: RemoveLiquidityInput,
        poolState: PoolState,
    ): Promise<RemoveLiquidityQueryOutput> {
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amounts = getAmountsQuery(sortedTokens, input);

        const userData = WeightedEncoder.encodeRemoveLiquidityUserData(
            input.kind,
            amounts,
        );

        const { args, tokensOut } = parseRemoveLiquidityArgs({
            chainId: input.chainId,
            poolId: poolState.id,
            sortedTokens,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            minAmountsOut: amounts.minAmountsOut,
            userData,
        });

        const queryOutput = await doRemoveLiquidityQuery(
            input.rpcUrl,
            input.chainId,
            args,
        );

        const bpt = new Token(input.chainId, poolState.address, 18);
        const bptIn = TokenAmount.fromRawAmount(bpt, queryOutput.bptIn);

        const amountsOut = queryOutput.amountsOut.map((a, i) =>
            TokenAmount.fromRawAmount(tokensOut[i], a),
        );

        return {
            poolType: poolState.type,
            removeLiquidityKind: input.kind,
            poolId: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex: amounts.tokenOutIndex,
            vaultVersion: poolState.vaultVersion,
            chainId: input.chainId,
        };
    }

    public queryRemoveLiquidityRecovery(
        input: RemoveLiquidityRecoveryInput,
        poolStateWithBalances: PoolStateWithBalances,
    ): RemoveLiquidityQueryOutput {
        const { tokenAmounts, bptAmount } = calculateProportionalAmounts(
            poolStateWithBalances,
            input.bptIn,
        );
        const bptToken = new Token(
            input.chainId,
            bptAmount.address,
            bptAmount.decimals,
        );
        const bptIn = TokenAmount.fromRawAmount(bptToken, bptAmount.rawAmount);
        const amountsOut = tokenAmounts.map((amountIn) =>
            TokenAmount.fromRawAmount(
                new Token(input.chainId, amountIn.address, amountIn.decimals),
                amountIn.rawAmount,
            ),
        );
        return {
            poolType: poolStateWithBalances.type,
            removeLiquidityKind: input.kind,
            poolId: poolStateWithBalances.id,
            bptIn,
            amountsOut,
            tokenOutIndex: undefined,
            vaultVersion: poolStateWithBalances.vaultVersion,
            chainId: input.chainId,
        };
    }

    public buildCall(
        input: RemoveLiquidityV2BaseBuildCallInput,
    ): RemoveLiquidityBuildCallOutput {
        const amounts = getAmountsCall(input);

        const userData = WeightedEncoder.encodeRemoveLiquidityUserData(
            input.removeLiquidityKind,
            amounts,
        );

        const { args } = parseRemoveLiquidityArgs({
            poolId: input.poolId,
            sortedTokens: input.amountsOut.map((a) => a.token),
            sender: input.sender,
            recipient: input.recipient,
            minAmountsOut: amounts.minAmountsOut,
            userData,
            toInternalBalance: !!input.toInternalBalance,
            wethIsEth: !!input.wethIsEth,
            chainId: input.chainId,
        });

        const call = encodeFunctionData({
            abi: vaultV2Abi,
            functionName: 'exitPool',
            args,
        });

        return {
            call,
            to: VAULT[input.chainId],
            value: 0n,
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
