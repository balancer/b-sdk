import {
    Address,
    encodeAbiParameters,
    encodeFunctionData,
    parseAbiParameters,
    Hex,
} from 'viem';
import { Token } from '@/entities/token';
import { BALANCER_RELAYER, ChainId, inputValidationError } from '@/utils';
import { batchRelayerLibraryAbi } from '@/abi';
import { Relayer } from '@/entities/relayer';
import { balWethAssets, balWethId } from './constants';
import { replaceWrapped } from './replaceWrapped';

export function encodeExitData(
    token: Token,
    userAddress: Address,
    swapOpRef: bigint,
    limit: bigint,
    wethIsEth: boolean,
): { exitPoolData: Hex; exitPoolOpRef: bigint } {
    const tokenOutIndex = balWethAssets.findIndex((t) =>
        token.isSameAddress(t),
    );
    if (tokenOutIndex === -1)
        throw inputValidationError(
            'auraBal Swap',
            `Remove Liquidity tokenOut ${token.address} not in BAL-WETH pool`,
        );
    const minAmountsOut = Array(balWethAssets.length).fill(0n);
    minAmountsOut[tokenOutIndex] = limit;
    // stable pool (no need to worry about phantomBpt)
    const poolKind = 1;
    // type 0 = EXACT_BPT_IN_FOR_ONE_TOKEN_OUT
    // bptAmountIn
    // exitTokenIndex
    const userData = encodeAbiParameters(
        parseAbiParameters('uint256, uint256, uint256'),
        [0n, swapOpRef, BigInt(tokenOutIndex)],
    );

    const exitPoolRequest = {
        assets: wethIsEth
            ? replaceWrapped(balWethAssets, ChainId.MAINNET)
            : balWethAssets,
        minAmountsOut,
        userData,
        toInternalBalance: false,
    };
    const exitPoolOpRefKey = Relayer.toChainedReference(1n);
    const exitPoolData = encodeFunctionData({
        abi: batchRelayerLibraryAbi,
        functionName: 'exitPool',
        args: [
            balWethId,
            poolKind,
            BALANCER_RELAYER[1], // BPT comes from the Relayer (so we can approve before exit)
            userAddress, // exit token goes to the user
            exitPoolRequest,
            [{ key: exitPoolOpRefKey, index: BigInt(tokenOutIndex) }],
        ] as const,
    });

    return {
        exitPoolData,
        exitPoolOpRef: exitPoolOpRefKey,
    };
}
