// A user can add liquidity to a boosted pool in various forms. The following ways are
// available:
// 1. Unbalanced - addLiquidityUnbalancedToERC4626Pool
// 2. Proportional - addLiquidityProportionalToERC4626Pool
import { TokenAmount } from '@/entities/tokenAmount';

import { createPublicClient, http } from 'viem';

import { PoolState, PoolStateWithUnderlyings } from '@/entities/types';

import {
    AddLiquidityBaseQueryOutput,
    AddLiquidityInput,
    AddLiquidityKind,
} from '../addLiquidity/types';

import {
    AddLiquidityBase,
    AddLiquidityBaseBuildCallInput,
    AddLiquidityBaseQueryOutput,
    AddLiquidityBuildCallOutput,
    AddLiquidityInput,
    AddLiquidityKind,
} from '../addLiquidity/types';

import { doAddLiquidityUnbalancedQuery } from './doAddLiquidityUnbalancedQuery';
import { doAddLiquidityProportionalQuery } from './doAddLiquidityPropotionalQuery';
import { Token } from '../token';
import { BALANCER_COMPOSITE_LIQUIDITY_ROUTER } from '@/utils';

import { getValue } from '@/entities/utils/getValue';
import { encodeFunctionData } from 'viem';
import { balancerCompositeLiquidityRouterAbi } from '@/abi';

import { Hex } from '@/types';

// The way this class is going to be used is without a wrapper.
// Anyone wanting to add liquidity will do two things
// 1. Fetch the poolState from an API
// 2. Construct his trading intend as a AddLiquidityInput type.
// 3. Then he will call the query function to fetch amountOut
// 4. Apply custom slippage tolerance
// 5. Build the call. (with the queryOutput and some custom data)

export class AddLiquidityBoostedV3 {
    async query(
        input: AddLiquidityInput,
        poolState: PoolState | PoolStateWithUnderlyings,
    ): Promise<AddLiquidityBaseQueryOutput> {
        // Technically possible to pass singleToken adds here due to type
        // disallow it for this class
        const bptToken = new Token(input.chainId, poolState.address, 18);

        let bptOut: TokenAmount;
        let amountsIn: TokenAmount[];
        let tokenInIndex: number | undefined;

        // input to a query function in other cases is defined as
        // input: AddLiquidityBoostedInput
        // poolState: PoolState.
        // Action: Both input types need to be defined in helper folders
        // Next up some validations need to be done. (why?) It should basically
        // catch all reverts that would happen on the SC side? These are the case for
        // nested adds - for boosted pool adds for now not required - see ticket
        // focusing on boosted pool adds with wrapped token.
        // potential validations could be:
        // 1. Are all tokens a user wants to join with the `asset` of the ERC4626 Vault?

        // TODO: Do tokens need to get sorted? Or are they provided in sorted order already?
        switch (input.kind) {
            case AddLiquidityKind.Unbalanced: {
                // Unbalanced joins provide exact amounts in
                // and retrieve the bpt amount out
                // bpt amout out needs to be calculated
                const bptAmountOut = await doAddLiquidityUnbalancedQuery(
                    input,
                    poolState.address,
                );
                bptOut = TokenAmount.fromRawAmount(bptToken, bptAmountOut);

                amountsIn = input.amountsIn.map((t) => {
                    return TokenAmount.fromRawAmount(
                        new Token(input.chainId, t.address, t.decimals),
                        t.rawAmount,
                    );
                });

                break;
            }
            case AddLiquidityKind.Proportional: {
                // proportional joins provide exact bpt amount out
                // and amountsIn need to be calculated
                const exactAmountsInNumbers =
                    await doAddLiquidityProportionalQuery(
                        input,
                        poolState.address,
                    );

                // we should have access to underlyings now.
                // for now the query return [0n, 0n]
                amountsIn = poolState.tokens.map((t, i) =>
                    //const token = new Token(input.chainId, t.address, t.decimals);
                    TokenAmount.fromRawAmount(
                        new Token(
                            input.chainId,
                            t.address,
                            t.decimals,
                            t.symbol,
                        ),
                        exactAmountsInNumbers[i],
                    ),
                );

                bptOut = TokenAmount.fromRawAmount(
                    bptToken,
                    input.referenceAmount.rawAmount,
                );
                break;
            }
        }

        const output: AddLiquidityBaseQueryOutput = {
            poolType: poolState.type,
            poolId: poolState.id,
            addLiquidityKind: input.kind,
            bptOut,
            amountsIn,
            tokenInIndex,
            chainId: input.chainId,
            protocolVersion: 3,
        };

        return output;
    }

    buildCall(
        input: AddLiquidityBaseBuildCallInput,
    ): AddLiquidityBuildCallOutput {
        // the job of this function is to craft the callData & return it with additonal obeject properties
        // The regular V3 addLiquidity returns a AddLiquidityBuildCallOutput
        let callData: Hex;
        let amountsIn: TokenAmount[];
        let amountsOut: TokenAmount[];

        switch (input.addLiquidityKind) {
            case AddLiquidityKind.Unbalanced: {
                amountsIn = input.amountsIn;
                amountsOut = [input.bptOut];

                // amounts in are raw here
                callData = encodeFunctionData({
                    abi: balancerCompositeLiquidityRouterAbi,
                    functionName: 'addLiquidityUnbalancedToERC4626Pool',
                    args: [
                        input.poolId, // pool
                        amountsIn.map((amount) => amount.amount), // amountsIn[]
                        0n, // minBptOut
                        !!input.wethIsEth, // wethisEth
                        '0x', // userData
                    ],
                });
                // minBptOut and maxAmountsIn are TokenAmount type
                break;
            }
            case AddLiquidityKind.Proportional: {
                // proportional join is based on having bpt amount as part of the input

                amountsIn = input.amountsIn; // from query
                amountsOut = [input.bptOut]; // from user

                callData = encodeFunctionData({
                    abi: balancerCompositeLiquidityRouterAbi,
                    functionName: 'addLiquidityProportionalToERC4626Pool',
                    args: [
                        input.poolId, // pool
                        input.amountsIn.map(
                            (tokenAmount) => tokenAmount.amount,
                        ), // maxAmountsIn
                        input.bptOut.amount, // minBptOut
                        !!input.wethIsEth, // wethisEth
                        '0x', // userData
                    ],
                });
                break;
            }
        }
        return {
            callData: callData,
            to: BALANCER_COMPOSITE_LIQUIDITY_ROUTER[input.chainId],
            value: getValue(input.amountsIn, !!input.wethIsEth),
            minBptOut: input.bptOut,
            maxAmountsIn: amountsIn,
        };
    }
}
