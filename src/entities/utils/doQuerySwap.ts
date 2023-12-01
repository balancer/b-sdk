import { createPublicClient, getContract, http } from 'viem';
import { BALANCER_QUERIES, ChainId, DEFAULT_FUND_MANAGMENT } from '../../utils';
import { TokenAmount } from '../tokenAmount';
import { Hex, InputToken, SingleSwap, SwapKind } from '../../types';
import { balancerQueriesAbi } from '../../abi';
import { Token } from '../token';

export type SingleSwapInput = {
    poolId: Hex;
    tokenIn: InputToken;
    tokenOut: InputToken;
    kind: SwapKind;
    givenAmount: bigint;
    rpcUrl: string;
    chainId: ChainId;
};

export const doQuerySwap = async ({
    poolId,
    kind,
    tokenIn,
    tokenOut,
    givenAmount,
    rpcUrl,
    chainId,
}: SingleSwapInput): Promise<TokenAmount> => {
    const publicClient = createPublicClient({
        transport: http(rpcUrl),
    });

    const queriesContract = getContract({
        address: BALANCER_QUERIES[chainId],
        abi: balancerQueriesAbi,
        publicClient,
    });

    const swap: SingleSwap = {
        poolId,
        kind,
        assetIn: tokenIn.address,
        assetOut: tokenOut.address,
        amount: givenAmount,
        userData: '0x',
    };

    const { result } = await queriesContract.simulate.querySwap([
        swap,
        DEFAULT_FUND_MANAGMENT,
    ]);

    const resultToken =
        kind === SwapKind.GivenIn
            ? new Token(chainId, tokenOut.address, tokenOut.decimals)
            : new Token(chainId, tokenIn.address, tokenIn.decimals);
    return TokenAmount.fromRawAmount(resultToken, result);
};
