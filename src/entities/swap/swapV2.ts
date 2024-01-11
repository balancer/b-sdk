import { BatchSwapStep, SingleSwap, SwapKind } from '@/types';
import { TokenAmount } from '../tokenAmount';
import {
    createPublicClient,
    encodeFunctionData,
    getContract,
    http,
} from 'viem';
import { BALANCER_QUERIES, DEFAULT_FUND_MANAGMENT, abs } from '@/utils';
import { balancerQueriesAbi } from '@/abi';
import { convertNativeAddressToZero } from '../utils/convertNativeAddressToZero';
import { Swap, SwapBase } from '.';

export class SwapV2 extends Swap implements SwapBase {
    async query(rpcUrl?: string, block?: bigint): Promise<TokenAmount> {
        const publicClient = createPublicClient({
            transport: http(rpcUrl),
        });

        const queriesContract = getContract({
            address: BALANCER_QUERIES[this.chainId],
            abi: balancerQueriesAbi,
            publicClient,
        });

        let amount: TokenAmount;
        if (this.isBatchSwap) {
            const { result } = await queriesContract.simulate.queryBatchSwap(
                [
                    this.swapKind,
                    this.swaps as BatchSwapStep[],
                    this.assets,
                    DEFAULT_FUND_MANAGMENT,
                ],
                {
                    blockNumber: block,
                },
            );

            amount =
                this.swapKind === SwapKind.GivenIn
                    ? TokenAmount.fromRawAmount(
                          this.outputAmount.token,
                          abs(
                              result[
                                  this.assets.indexOf(
                                      convertNativeAddressToZero(
                                          this.outputAmount.token.address,
                                      ),
                                  )
                              ],
                          ),
                      )
                    : TokenAmount.fromRawAmount(
                          this.inputAmount.token,
                          abs(
                              result[
                                  this.assets.indexOf(
                                      convertNativeAddressToZero(
                                          this.inputAmount.token.address,
                                      ),
                                  )
                              ],
                          ),
                      );
        } else {
            const { result } = await queriesContract.simulate.querySwap(
                [this.swaps as SingleSwap, DEFAULT_FUND_MANAGMENT],
                { blockNumber: block },
            );

            amount =
                this.swapKind === SwapKind.GivenIn
                    ? TokenAmount.fromRawAmount(this.outputAmount.token, result)
                    : TokenAmount.fromRawAmount(this.inputAmount.token, result);
        }

        return amount;
    }

    queryCallData(): string {
        let callData: string;
        if (this.isBatchSwap) {
            callData = encodeFunctionData({
                abi: balancerQueriesAbi,
                functionName: 'queryBatchSwap',
                args: [
                    this.swapKind,
                    this.swaps as BatchSwapStep[],
                    this.assets,
                    DEFAULT_FUND_MANAGMENT,
                ],
            });
        } else {
            callData = encodeFunctionData({
                abi: balancerQueriesAbi,
                functionName: 'querySwap',
                args: [this.swaps as SingleSwap, DEFAULT_FUND_MANAGMENT],
            });
        }
        return callData;
    }
}
