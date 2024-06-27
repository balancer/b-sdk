import { Address, encodeFunctionData, Hex } from 'viem';
import { MAX_UINT256 } from '@/utils';
import { batchRelayerLibraryAbi } from '@/abi';
import { Relayer } from '@/entities/relayer';
import { auraBalStableId, balWethAddress, auraBAL } from './constants';

export function getSwapData(
    joinPoolOpRef: bigint,
    sender: Address,
    recipient: Address,
    limit: bigint,
    value: bigint,
): { swapData: Hex; swapOpRef: bigint } {
    const singleSwap = {
        poolId: auraBalStableId as Hex,
        kind: 0,
        assetIn: balWethAddress,
        assetOut: auraBAL as Address,
        amount: joinPoolOpRef,
        userData: '0x' as Hex,
    };
    const funds = {
        sender,
        recipient,
        fromInternalBalance: false,
        toInternalBalance: false,
    };
    const swapOpRef = Relayer.toChainedReference(2n);

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
