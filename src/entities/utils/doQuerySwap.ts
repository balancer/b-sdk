import { createPublicClient, getContract, http } from 'viem';
import { BALANCER_QUERIES, ChainId, DEFAULT_FUND_MANAGMENT } from '../../utils';
import { TokenAmount } from '../tokenAmount';
import { Hex, SingleSwap, SwapKind } from '../../types';
import { balancerQueriesAbi } from '../../abi';
import { Token } from '../token';

export const doQuerySwap = async (
    poolId: Hex,
    kind: SwapKind,
    givenAmount: TokenAmount,
    returnToken: Token,
    rpcUrl: string,
    chainId: ChainId,
): Promise<TokenAmount> => {
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
        assetIn:
            kind === SwapKind.GivenIn
                ? givenAmount.token.address
                : returnToken.address,
        assetOut:
            kind === SwapKind.GivenOut
                ? givenAmount.token.address
                : returnToken.address,
        amount: givenAmount.amount,
        userData: '0x',
    };

    const { result } = await queriesContract.simulate.querySwap([
        swap,
        DEFAULT_FUND_MANAGMENT,
    ]);

    return TokenAmount.fromRawAmount(returnToken, result);
};
