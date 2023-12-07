import { Address, encodeFunctionData, formatUnits, parseEther } from 'viem';
import { AddLiquidityAmounts, PoolState } from '../../types';
import { AddLiquidityInitBase, AddLiquidityInitInput } from '../types';
import { BALANCER_VAULT, ZERO_ADDRESS } from '../../../utils';
import { TokenAmount } from '../../tokenAmount';
import { sortTokensByAddress } from '../../../utils/tokens';
import { vaultAbi } from '../../../abi';
import { getAmounts, parseAddLiquidityArgs } from '../../utils';
import { Token } from '../../token';
import { WeightedEncoder } from '../../encoders';
import { AddLiquidityBuildOutput } from '../../addLiquidity/types';
import { WeightedInitInputAmount } from '../../../types';

export class AddLiquidityInitWeighted implements AddLiquidityInitBase {
    
    buildCall(
        input: AddLiquidityInitInput,
        poolState: PoolState,
    ): AddLiquidityBuildOutput {
        const amounts = this.getAmounts(input, poolState.tokens);
        const userData = WeightedEncoder.encodeAddLiquidityUserData(
            input.kind,
            amounts,
        );
        const bpt = new Token(input.chainId, poolState.address, 18);
        const { args } = parseAddLiquidityArgs({
            ...input,
            poolId: poolState.id,
            sortedTokens: sortTokensByAddress(poolState.tokens),
            maxAmountsIn: amounts.maxAmountsIn,
            userData,
            fromInternalBalance: input.fromInternalBalance ?? false,
        });

        const call = encodeFunctionData({
            abi: vaultAbi,
            functionName: 'joinPool',
            args,
        });

        const value = input.amountsIn.find(
            (a) => a.address === ZERO_ADDRESS,
        )?.rawAmount;

        return {
            call,
            to: BALANCER_VAULT as Address,
            value: value === undefined ? 0n : value,
            minBptOut: TokenAmount.fromRawAmount(bpt, amounts.minimumBpt),
            maxAmountsIn: sortTokensByAddress(poolState.tokens).map((t, i) =>
                TokenAmount.fromRawAmount(t, amounts.maxAmountsIn[i]),
            ),
        };
    }

    private getAmounts(
        input: AddLiquidityInitInput,
        poolTokens: Token[],
    ): AddLiquidityAmounts {
        const minimumBpt = this.calculateBptOut(
            input.amountsIn as WeightedInitInputAmount[],
        );
        return {
            minimumBpt,
            maxAmountsIn: getAmounts(
                sortTokensByAddress(poolTokens),
                input.amountsIn,
            ),
            tokenInIndex: undefined,
        };
    }

    private calculateBptOut(amounts: WeightedInitInputAmount[]): bigint {
        const tokensQtd = amounts.length;
        const poolInvariant = amounts.reduce((acc, curr) => {
            return (
                acc *
                parseFloat(formatUnits(curr.rawAmount, curr.decimals)) **
                    parseFloat(formatUnits(BigInt(curr.weight), 18))
            );
        }, 1);
        const bptOut = poolInvariant * tokensQtd;
        return parseEther(bptOut.toString());
    }
}
