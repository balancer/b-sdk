import {
    AddLiquidityBoostedUnbalancedInput,
    AddLiquidityBoostedV3,
    AddLiquidityKind,
    PoolStateWithUnderlyings,
    Slippage,
    Token,
} from '@/entities';
import {
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
    ChainId,
    PERMIT2,
    PublicWalletClient,
} from '@/utils';
import { Address, TestActions } from 'viem';
import {
    approveSpenderOnPermit2,
    approveSpenderOnToken,
    sendTransactionGetBalances,
    setTokenBalances,
} from './helper';

export async function GetBoostedBpt(
    chainId: ChainId,
    rpcUrl: string,
    testAddress: Address,
    client: PublicWalletClient & TestActions,
    poolState: PoolStateWithUnderlyings,
    amountsIn: {
        address: Address;
        rawAmount: bigint;
        decimals: number;
        slot: number;
    }[],
): Promise<bigint> {
    await setTokenBalances(
        client,
        testAddress,
        amountsIn.map((t) => t.address),
        amountsIn.map((t) => t.slot),
        amountsIn.map((t) => t.rawAmount),
    );

    const addLiquidityInput: AddLiquidityBoostedUnbalancedInput = {
        amountsIn,
        chainId,
        rpcUrl,
        kind: AddLiquidityKind.Unbalanced,
    };

    const addLiquidityBoosted = new AddLiquidityBoostedV3();

    for (const amount of addLiquidityInput.amountsIn) {
        // Approve Permit2 to spend account tokens
        await approveSpenderOnToken(
            client,
            testAddress,
            amount.address,
            PERMIT2[chainId],
        );
        // Approve Router to spend account tokens using Permit2
        await approveSpenderOnPermit2(
            client,
            testAddress,
            amount.address,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
        );
    }

    const queryOutput = await addLiquidityBoosted.query(
        addLiquidityInput,
        poolState,
    );

    const addLiquidityBuildInput = {
        ...queryOutput,
        slippage: Slippage.fromPercentage('1'), // 1%,
    };

    const addLiquidityBuildCallOutput = addLiquidityBoosted.buildCall(
        addLiquidityBuildInput,
    );

    // send add liquidity transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [queryOutput.bptOut.token.address],
            client,
            testAddress,
            addLiquidityBuildCallOutput.to,
            addLiquidityBuildCallOutput.callData,
            addLiquidityBuildCallOutput.value,
        );
    expect(transactionReceipt.status).is.eq('success');
    expect(balanceDeltas[0] > 0n).is.true;

    for (const amount of addLiquidityInput.amountsIn) {
        // Approve Permit2 to spend account tokens
        await approveSpenderOnToken(
            client,
            testAddress,
            amount.address,
            PERMIT2[chainId],
            0n,
        );
        // Approve Router to spend account tokens using Permit2
        await approveSpenderOnPermit2(
            client,
            testAddress,
            amount.address,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[chainId],
            0n,
        );
    }
    return balanceDeltas[0];
}

export const assertTokenMatch = (
    tokenDefined: Token[],
    tokenReturned: Token[],
) => {
    tokenDefined.map((tokenAmount) => {
        expect(
            tokenReturned.some(
                (token) => token.address === tokenAmount.address,
            ),
        ).to.be.true;
    });
    tokenDefined.map((a, i) => {
        expect(a.decimals).to.eq(tokenReturned[i].decimals);
    });
};
