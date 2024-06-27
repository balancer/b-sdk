import { Address, encodeFunctionData, Hex } from 'viem';
import { MAX_UINT256 } from '@/utils';
import { batchRelayerLibraryAbi } from '@/abi';
import { Relayer } from '@/entities/relayer';
import { auraBalStableId } from './constants';

export function getSwapData(
    amount: bigint,
    assetIn: Address,
    assetOut: Address,
    sender: Address,
    recipient: Address,
    limit: bigint,
    value: bigint,
    isTempRef: boolean,
): { swapData: Hex; swapOpRef: bigint } {
    const singleSwap = {
        poolId: auraBalStableId as Hex,
        kind: 0,
        assetIn,
        assetOut,
        amount, // Note - this can be an opRef
        userData: '0x' as Hex,
    };
    const funds = {
        sender,
        recipient,
        fromInternalBalance: false,
        toInternalBalance: false,
    };

    // When its not a temp ref it can be read more than once
    const swapOpRef = Relayer.toChainedReference(2n, isTempRef);

    const swapData = encodeFunctionData({
        abi: batchRelayerLibraryAbi,
        functionName: 'swap',
        args: [
            singleSwap,
            funds,
            limit,
            MAX_UINT256,
            value,
            swapOpRef,
        ] as const,
    });

    return {
        swapData,
        swapOpRef,
    };
}
