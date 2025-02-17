import {
    Address,
    encodeAbiParameters,
    encodeFunctionData,
    parseAbiParameters,
    Hex,
} from 'viem';
import { Token } from '@/entities/token';
import { BALANCER_RELAYER, ChainId, NATIVE_ASSETS } from '@/utils';
import { batchRelayerLibraryAbi } from '@/abi';
import { Relayer } from '@/entities/relayer';
import { balWethAssets, balWethId } from './constants';
import { replaceWrapped } from './replaceWrapped';

export function encodeJoinData(
    token: Token,
    sender: Address,
    inputAmount: bigint,
    wethIsEth: boolean,
): { joinPoolData: Hex; joinPoolOpRef: bigint; value: bigint } {
    const tokenInIndex = balWethAssets.findIndex((t) => token.isSameAddress(t));
    if (tokenInIndex === -1)
        throw new Error(`Join token not in BAL-WETH pool ${token.address}`);

    const useNativeAsset =
        wethIsEth && token.isUnderlyingEqual(NATIVE_ASSETS[ChainId.MAINNET]);

    const maxAmountsIn = Array(balWethAssets.length).fill(0n);
    maxAmountsIn[tokenInIndex] = inputAmount;
    // stable pool (no need to worry about phantomBpt)
    const poolKind = 1;
    // type 1 = EXACT_TOKENS_IN_FOR_BPT_OUT
    // amountsIn
    // minimumBPT - as join is first in multicall we use 0 as min (not safe otherwise)
    const userData = encodeAbiParameters(
        parseAbiParameters('uint256, uint256[], uint256'),
        [1n, maxAmountsIn, 0n],
    );
    const joinPoolRequest = {
        assets: useNativeAsset
            ? replaceWrapped(balWethAssets, ChainId.MAINNET)
            : balWethAssets,
        maxAmountsIn,
        userData,
        fromInternalBalance: false,
    };
    // Note this opref must be non-temp as it is used in approval then swap
    const joinPoolOpRef = Relayer.toChainedReference(1n, false);
    const value = useNativeAsset ? inputAmount : 0n;
    const joinPoolData = encodeFunctionData({
        abi: batchRelayerLibraryAbi,
        functionName: 'joinPool',
        args: [
            balWethId,
            poolKind,
            sender, // Join tokens come from the user
            BALANCER_RELAYER[ChainId.MAINNET], // BPT goes to the Relayer (so we can approve for swap)
            joinPoolRequest,
            value,
            joinPoolOpRef,
        ] as const,
    });

    return {
        joinPoolData,
        joinPoolOpRef,
        value,
    };
}
