import { encodeFunctionData, zeroAddress } from 'viem';
import { TokenAmount } from '@/entities/tokenAmount';
import { Token } from '@/entities/token';
import { PoolState } from '@/entities/types';
import { Permit2 } from '@/entities/permit2Helper';
import {
    balancerUnbalancedAddViaSwapRouterAbiExtended,
    balancerRouterAbiExtended,
} from '@/abi';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { getValue, getSortedTokens } from '@/entities/utils';
import { Hex, Address } from '@/types';
import { doAddLiquidityUnbalancedViaSwapQuery } from './doAddLiquidityUnbalancedViaSwapQuery';
import { validateAddLiquidityUnbalancedViaSwapInput } from './validateInputs';
import { getAmountsCallUnbalancedViaSwap } from './helpers';
import {
    AddLiquidityUnbalancedViaSwapInput,
    AddLiquidityUnbalancedViaSwapQueryOutput,
    AddLiquidityUnbalancedViaSwapBuildCallInput,
    AddLiquidityUnbalancedViaSwapBuildCallOutput,
} from './types';
import { getBptAmountFromReferenceAmount } from '../utils/proportionalAmountsHelpers';
import {
    getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensGivenIn,
    getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensExactInMinAdjustable,
    getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensGivenOut,
} from '../utils/unbalancedJoinViaSwapHelpers';
import { SwapKind } from '@/types';
import { SDKError } from '@/utils/errors';
import { MAX_UINT256 } from '@/utils';

// Export types
export type {
    AddLiquidityUnbalancedViaSwapInput,
    AddLiquidityUnbalancedViaSwapQueryOutput,
    AddLiquidityUnbalancedViaSwapBuildCallInput,
    AddLiquidityUnbalancedViaSwapBuildCallOutput,
} from './types';

export class AddLiquidityUnbalancedViaSwapV3 {
    async query(
        input: AddLiquidityUnbalancedViaSwapInput,
        poolState: PoolState,
        block?: bigint,
    ): Promise<AddLiquidityUnbalancedViaSwapQueryOutput> {
        validateAddLiquidityUnbalancedViaSwapInput(input);

        // GivenIn is the default swap kind. A GivenIn Swap
        // is expected to produce the lower amount of maxAdjustableAmount.
        // as it downscales the exactBptAmountOut calculated from the
        // proportional join helper (calcBptOutFromReferenceAmount).
        const swapKind = input.swapKind ?? SwapKind.GivenIn;

        const sender = input.sender ?? zeroAddress;
        const addLiquidityUserData = input.addLiquidityUserData ?? '0x';
        const swapUserData = input.swapUserData ?? '0x';

        // Convert input amounts to TokenAmount objects
        const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
        const amountsIn = sortedTokens.map((token, index) => {
            const inputAmount = input.amountsIn.find(
                (amount) =>
                    amount.address.toLowerCase() ===
                    token.address.toLowerCase(),
            );
            if (!inputAmount) {
                throw new Error(`Token amount not found for ${token.address}`);
            }
            return TokenAmount.fromRawAmount(token, inputAmount.rawAmount);
        });

        // Use the provided exact token index
        const exactTokenIndex = input.exactTokenIndex;
        const adjustableTokenIndex = exactTokenIndex === 0 ? 1 : 0;
        const exactToken = amountsIn[exactTokenIndex].token.address;
        const exactAmount = amountsIn[exactTokenIndex].amount;

        const maxAdjustableAmountRaw = amountsIn[adjustableTokenIndex].amount;

        // Calculate BPT amount from the reference amount (like proportional)
        // Only proportional amount is possible here as not every pool type
        // has a unbalanced way to add. The bpt amount here is actually higher
        // than what the user has intention of adding.

        // There are going to be two calculation scenarions.
        // 1. The user wants to join purely single sided (Will throw an error)
        // 2. The user wants to join unbalanced with two tokens (GivenIn or GivenOut)

        // The exactAmountIn is not 0, as this has been validated in the validateInputs function before

        // NOTE: A purely single-sided join (maxAdjustableAmountRaw = 0) is not
        // supported by the UnbalancedAddViaSwapRouter: the proportional add
        // always contributes some adjustable token, and the internal correction
        // swap cannot, in general, drive the final adjustable contribution all
        // the way to zero without violating Vault/router constraints. We therefore
        // treat this as an unsupported configuration at the SDK level.
        if (input.amountsIn.some((amount) => amount.rawAmount == 0n)) {
            throw new SDKError(
                'UnbalancedJoinViaSwap',
                'AddLiquidityUnbalancedViaSwapV3.query',
                'Single-sided joins with maxAdjustableAmount = 0 are not supported by UnbalancedAddViaSwapRouter. Please provide a non-zero adjustable amount or use a different path.',
            );
        } else {
            if (swapKind === SwapKind.GivenIn) {
                // probably the better option for the user
                const bptAmount =
                    input.minimizeAdjustableAmount === true
                        ? await getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensExactInMinAdjustable(
                              {
                                  chainId: input.chainId,
                                  rpcUrl: input.rpcUrl,
                                  referenceAmount: {
                                      address: exactToken,
                                      rawAmount: exactAmount,
                                      decimals:
                                          amountsIn[exactTokenIndex].token
                                              .decimals,
                                  },
                                  kind: 'Proportional' as any, // Add the required kind property
                                  maxAdjustableAmountRaw:
                                      maxAdjustableAmountRaw,
                              },
                              poolState,
                          )
                        : await getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensGivenIn(
                              {
                                  chainId: input.chainId,
                                  rpcUrl: input.rpcUrl,
                                  referenceAmount: {
                                      address: exactToken,
                                      rawAmount: exactAmount,
                                      decimals:
                                          amountsIn[exactTokenIndex].token
                                              .decimals,
                                  },
                                  kind: 'Proportional' as any, // Add the required kind property
                                  maxAdjustableAmountRaw:
                                      maxAdjustableAmountRaw,
                              },
                              poolState,
                          );
                const bptToken = new Token(
                    input.chainId,
                    poolState.address,
                    18,
                );
                const bptOut = TokenAmount.fromRawAmount(
                    bptToken,
                    bptAmount.rawAmount,
                );

                // Query the router to get the actual amounts in needed
                // The Router expects a BPTAmount, exactTokenAmount, and maxAdjustableAmount
                const amountsInNumbers =
                    await doAddLiquidityUnbalancedViaSwapQuery(
                        input.rpcUrl,
                        input.chainId,
                        input.pool,
                        sender,
                        bptAmount.rawAmount,
                        exactToken,
                        exactAmount,
                        amountsIn[adjustableTokenIndex].amount,
                        addLiquidityUserData,
                        swapUserData,
                        block,
                    );

                // Create final TokenAmount objects from the query result
                const finalAmountsIn = sortedTokens.map((token, index) => {
                    return TokenAmount.fromRawAmount(
                        token,
                        amountsInNumbers[index],
                    );
                });

                const output: AddLiquidityUnbalancedViaSwapQueryOutput = {
                    pool: input.pool,
                    bptOut,
                    amountsIn: finalAmountsIn,
                    chainId: input.chainId,
                    protocolVersion: 3,
                    to: AddressProvider.Router(input.chainId),
                    addLiquidityUserData,
                    swapUserData,
                    exactToken,
                    exactAmount,
                    adjustableTokenIndex,
                };

                return output;
            } else {
                // the option available for the user
                // intention is to trigger an EXACT_OUT correction swap
                const bptAmount =
                    await getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensGivenOut(
                        {
                            chainId: input.chainId,
                            rpcUrl: input.rpcUrl,
                            referenceAmount: {
                                address: exactToken,
                                rawAmount: exactAmount,
                                decimals:
                                    amountsIn[exactTokenIndex].token.decimals,
                            },
                            kind: 'Proportional' as any, // Add the required kind property
                            maxAdjustableAmountRaw: maxAdjustableAmountRaw,
                        },
                        poolState,
                    );
                const bptToken = new Token(
                    input.chainId,
                    poolState.address,
                    18,
                );
                const bptOut = TokenAmount.fromRawAmount(
                    bptToken,
                    bptAmount.rawAmount,
                );

                // Query the router to get the actual amounts in needed
                // The Router expects a BPTAmount, exactTokenAmount, and maxAdjustableAmount
                const amountsInNumbers =
                    await doAddLiquidityUnbalancedViaSwapQuery(
                        input.rpcUrl,
                        input.chainId,
                        input.pool,
                        sender,
                        bptAmount.rawAmount,
                        exactToken,
                        exactAmount,
                        amountsIn[adjustableTokenIndex].amount,
                        addLiquidityUserData,
                        swapUserData,
                        block,
                    );

                // Create final TokenAmount objects from the query result
                const finalAmountsIn = sortedTokens.map((token, index) => {
                    return TokenAmount.fromRawAmount(
                        token,
                        amountsInNumbers[index],
                    );
                });

                const output: AddLiquidityUnbalancedViaSwapQueryOutput = {
                    pool: input.pool,
                    bptOut,
                    amountsIn: finalAmountsIn,
                    chainId: input.chainId,
                    protocolVersion: 3,
                    to: AddressProvider.Router(input.chainId),
                    addLiquidityUserData,
                    swapUserData,
                    exactToken,
                    exactAmount,
                    adjustableTokenIndex,
                };

                return output;
            }
        }
    }

    buildCall(
        input: AddLiquidityUnbalancedViaSwapBuildCallInput,
    ): AddLiquidityUnbalancedViaSwapBuildCallOutput {
        const amounts = getAmountsCallUnbalancedViaSwap(input);
        const wethIsEth = input.wethIsEth ?? false;

        const callData = encodeFunctionData({
            abi: balancerUnbalancedAddViaSwapRouterAbiExtended,
            functionName: 'addLiquidityUnbalanced',
            args: [
                input.pool,
                input.deadline,
                wethIsEth,
                {
                    exactBptAmountOut: amounts.exactBptAmountOut,
                    exactToken: input.exactToken,
                    exactAmount: input.exactAmount,
                    maxAdjustableAmount: amounts.maxAdjustableAmount,
                    addLiquidityUserData: input.addLiquidityUserData,
                    swapUserData: input.swapUserData,
                } as any,
            ] as const,
        });

        const value = getValue(input.amountsIn, wethIsEth);
        const exactBptAmountOut = TokenAmount.fromRawAmount(
            input.bptOut.token,
            amounts.exactBptAmountOut,
        );
        const maxAdjustableAmount = TokenAmount.fromRawAmount(
            input.amountsIn[input.adjustableTokenIndex].token,
            amounts.maxAdjustableAmount,
        );

        return {
            callData,
            to: AddressProvider.UnbalancedAddViaSwapRouter(input.chainId),
            value,
            exactBptAmountOut,
            maxAdjustableAmount,
        };
    }

    public buildCallWithPermit2(
        input: AddLiquidityUnbalancedViaSwapBuildCallInput,
        permit2: Permit2,
    ): AddLiquidityUnbalancedViaSwapBuildCallOutput {
        // Generate same calldata as buildCall
        const buildCallOutput = this.buildCall(input);

        const args = [
            [],
            [],
            permit2.batch,
            permit2.signature,
            [buildCallOutput.callData],
        ] as const;

        const callData = encodeFunctionData({
            abi: balancerRouterAbiExtended,
            functionName: 'permitBatchAndCall',
            args,
        });

        return {
            ...buildCallOutput,
            callData,
        };
    }
}

/**
 * Standalone discovery helper used by frontends/tests to fetch "natural"
 * amountsIn and bptOut for an unbalanced-join-via-swap operation, without
 * enforcing any maxAdjustableAmount cap.
 *
 * It:
 *  - Computes a BPT target using the GivenIn/GivenOut BPT helper with
 *    maxAdjustableAmountRaw = MAX_UINT256.
 *  - Calls the router's query function with that BPT and MAX_UINT256.
 *  - Returns the resulting bptOut and amountsIn, which callers can use to
 *    suggest an appropriate maxAdjustableAmount to users.
 *
 * The swapKind parameter overrides input.swapKind and defaults to GivenIn.
 */
export const discoverNaturalAmountsUnbalancedViaSwap = async (
    input: AddLiquidityUnbalancedViaSwapInput,
    poolState: PoolState,
    swapKind: SwapKind = SwapKind.GivenIn,
    block?: bigint,
): Promise<AddLiquidityUnbalancedViaSwapQueryOutput> => {
    validateAddLiquidityUnbalancedViaSwapInput(input);

    const sender = input.sender ?? zeroAddress;
    const addLiquidityUserData = input.addLiquidityUserData ?? '0x';
    const swapUserData = input.swapUserData ?? '0x';

    const sortedTokens = getSortedTokens(poolState.tokens, input.chainId);
    const amountsIn = sortedTokens.map((token) => {
        const inputAmount = input.amountsIn.find(
            (amount) =>
                amount.address.toLowerCase() === token.address.toLowerCase(),
        );
        if (!inputAmount) {
            throw new Error(`Token amount not found for ${token.address}`);
        }
        return TokenAmount.fromRawAmount(token, inputAmount.rawAmount);
    });

    const exactTokenIndex = input.exactTokenIndex;
    const adjustableTokenIndex = exactTokenIndex === 0 ? 1 : 0;
    const exactToken = amountsIn[exactTokenIndex].token.address;
    const exactAmount = amountsIn[exactTokenIndex].amount;

    const maxAdjustableUnlimited = MAX_UINT256;

    const referenceAmount: InputAmount = {
        address: exactToken,
        rawAmount: exactAmount,
        decimals: amountsIn[exactTokenIndex].token.decimals,
    };

    const bptAmount =
        swapKind === SwapKind.GivenIn
            ? await getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensGivenIn(
                  {
                      chainId: input.chainId,
                      rpcUrl: input.rpcUrl,
                      referenceAmount,
                      kind: 'Proportional' as any,
                      maxAdjustableAmountRaw: maxAdjustableUnlimited,
                  },
                  poolState,
              )
            : await getBptAmountFromReferenceAmountUnbalancedViaSwapTwoTokensGivenOut(
                  {
                      chainId: input.chainId,
                      rpcUrl: input.rpcUrl,
                      referenceAmount,
                      kind: 'Proportional' as any,
                      maxAdjustableAmountRaw: maxAdjustableUnlimited,
                  },
                  poolState,
              );

    const amountsInNumbers = await doAddLiquidityUnbalancedViaSwapQuery(
        input.rpcUrl,
        input.chainId,
        input.pool,
        sender,
        bptAmount.rawAmount,
        exactToken,
        exactAmount,
        maxAdjustableUnlimited,
        addLiquidityUserData,
        swapUserData,
        block,
    );

    const finalAmountsIn = sortedTokens.map((token, index) =>
        TokenAmount.fromRawAmount(token, amountsInNumbers[index]),
    );

    const bptToken = new Token(input.chainId, poolState.address, 18);
    const bptOut = TokenAmount.fromRawAmount(bptToken, bptAmount.rawAmount);

    return {
        pool: input.pool,
        bptOut,
        amountsIn: finalAmountsIn,
        chainId: input.chainId,
        protocolVersion: 3,
        to: AddressProvider.Router(input.chainId),
        addLiquidityUserData,
        swapUserData,
        exactToken,
        exactAmount,
        adjustableTokenIndex,
    };
};
