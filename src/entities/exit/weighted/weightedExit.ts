import { createPublicClient, encodeFunctionData, http } from 'viem';
import { Token, TokenAmount, WeightedEncoder } from '../../..';
import { Address } from '../../../types';
import {
    BALANCER_HELPERS,
    BALANCER_VAULT,
    CHAINS,
    MAX_UINT256,
    ZERO_ADDRESS,
} from '../../../utils';
import { balancerHelpersAbi, vaultAbi } from '../../../abi';
import { getExitParameters } from './helpers';
import {
    BaseExit,
    BuildOutput,
    ExitCallInput,
    ExitInput,
    ExitKind,
    ExitQueryResult,
} from '../types';
import { replaceWrapped } from '../../utils';
import { PoolState } from '../../types';

export class WeightedExit implements BaseExit {
    public async query(
        input: ExitInput,
        poolState: PoolState,
    ): Promise<ExitQueryResult> {
        const poolTokens = poolState.tokens.map(
            (t) => new Token(input.chainId, t.address, t.decimals),
        );
        let minAmountsOut = Array(poolTokens.length).fill(0n);
        let userData: Address;

        switch (input.kind) {
            case ExitKind.UNBALANCED:
                minAmountsOut = poolTokens.map(
                    (t) =>
                        input.amountsOut.find((a) => a.token.isEqual(t))
                            ?.amount ?? 0n,
                );
                userData = WeightedEncoder.exitUnbalanced(
                    minAmountsOut,
                    MAX_UINT256,
                );
                break;
            case ExitKind.SINGLE_ASSET:
                userData = WeightedEncoder.exitSingleAsset(
                    input.bptIn.amount,
                    poolTokens.findIndex(
                        (t) => t.address === input.tokenOut.toLowerCase(),
                    ),
                );
                break;
            case ExitKind.PROPORTIONAL:
                userData = WeightedEncoder.exitProportional(input.bptIn.amount);
                break;
        }

        let tokensOut = [...poolTokens];
        // replace wrapped token with native asset if needed
        if (input.exitWithNativeAsset)
            tokensOut = replaceWrapped(poolTokens, input.chainId);

        const queryArgs = getExitParameters({
            poolId: poolState.id,
            assets: tokensOut.map((t) => t.address),
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            minAmountsOut,
            userData,
            toInternalBalance: false, // TODO - Should we make this part of input?
        });

        const client = createPublicClient({
            transport: http(input.rpcUrl),
            chain: CHAINS[input.chainId],
        });

        const {
            result: [queryBptIn, queryAmountsOut],
        } = await client.simulateContract({
            address: BALANCER_HELPERS[input.chainId],
            abi: balancerHelpersAbi,
            functionName: 'queryExit',
            args: queryArgs,
        });

        const bpt = new Token(input.chainId, poolState.address, 18);
        const bptIn = TokenAmount.fromRawAmount(bpt, queryBptIn);

        const amountsOut = queryAmountsOut.map((a, i) =>
            TokenAmount.fromRawAmount(tokensOut[i], a),
        );

        const tokenOutIndex =
            input.kind === ExitKind.SINGLE_ASSET
                ? poolTokens.findIndex(
                      (t) => t.address === input.tokenOut.toLowerCase(),
                  )
                : undefined;

        return {
            exitKind: input.kind,
            id: poolState.id,
            bptIn,
            amountsOut,
            tokenOutIndex,
        };
    }

    public buildCall(input: ExitCallInput): BuildOutput {
        let minAmountsOut: bigint[];
        let maxBptIn: bigint;
        let userData: Address;

        switch (input.exitKind) {
            case ExitKind.UNBALANCED:
                minAmountsOut = input.amountsOut.map((a) => a.amount);
                maxBptIn = input.slippage.applyTo(input.bptIn.amount);
                userData = WeightedEncoder.exitUnbalanced(
                    minAmountsOut,
                    maxBptIn,
                );
                break;
            case ExitKind.SINGLE_ASSET:
                if (input.tokenOutIndex === undefined) {
                    throw new Error(
                        'tokenOutIndex must be defined for SINGLE_ASSET exit',
                    );
                }
                minAmountsOut = input.amountsOut.map((a) =>
                    input.slippage.removeFrom(a.amount),
                );
                maxBptIn = input.bptIn.amount;
                userData = WeightedEncoder.exitSingleAsset(
                    maxBptIn,
                    input.tokenOutIndex,
                );
                break;
            case ExitKind.PROPORTIONAL:
                minAmountsOut = input.amountsOut.map((a) =>
                    input.slippage.removeFrom(a.amount),
                );
                maxBptIn = input.bptIn.amount;
                userData = WeightedEncoder.exitProportional(input.bptIn.amount);
                break;
        }

        const queryArgs = getExitParameters({
            poolId: input.id,
            assets: input.amountsOut.map((a) => a.token.address),
            sender: input.sender,
            recipient: input.recipient,
            minAmountsOut,
            userData,
            toInternalBalance: false, // TODO - Should we make this part of input?
        });

        const call = encodeFunctionData({
            abi: vaultAbi,
            functionName: 'exitPool',
            args: queryArgs,
        });

        // Encode data
        return {
            call,
            to: BALANCER_VAULT,
            value: 0n,
            maxBptIn,
            minAmountsOut,
        };
    }
}
