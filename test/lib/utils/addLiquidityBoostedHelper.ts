import {
    AddLiquidityBoostedInput,
    AddLiquidityBoostedQueryOutput,
    AddLiquidityBoostedUnbalancedInput,
    AddLiquidityBoostedV3,
    AddLiquidityBuildCallOutput,
    AddLiquidityKind,
    PoolStateWithUnderlyings,
    Slippage,
    TokenAmount,
} from '@/entities';
import { ChainId, NATIVE_ASSETS, PERMIT2, PublicWalletClient } from '@/utils';
import { Address, TestActions, TransactionReceipt, zeroAddress } from 'viem';
import {
    approveSpenderOnPermit2,
    approveSpenderOnToken,
    sendTransactionGetBalances,
    setTokenBalances,
} from './helper';
import { areBigIntsWithinPercent } from './swapHelpers';
import { AddressProvider } from '@/entities/inputValidator/utils/addressProvider';
import { BaseToken } from '@/entities/baseToken';

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
            AddressProvider.CompositeLiquidityRouter(chainId),
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
            AddressProvider.CompositeLiquidityRouter(chainId),
            0n,
        );
    }
    return balanceDeltas[0];
}

export const assertTokenMatch = (
    tokenDefined: BaseToken[],
    tokenReturned: BaseToken[],
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

export type AddLiquidityBoostedTxInput = {
    client: PublicWalletClient & TestActions;
    addLiquidityBoosted: AddLiquidityBoostedV3;
    addLiquidityBoostedInput: AddLiquidityBoostedInput;
    slippage: Slippage;
    poolStateWithUnderlyings: PoolStateWithUnderlyings;
    testAddress: Address;
    wethIsEth?: boolean;
    fromInternalBalance?: boolean;
    usePermit2Signatures?: boolean;
};

export type AddLiquidityBoostedTxOutput = {
    addLiquidityBoostedQueryOutput: AddLiquidityBoostedQueryOutput;
    addLiquidityBuildCallOutput: AddLiquidityBuildCallOutput;
    tokenAmountsForBalanceCheck: TokenAmount[];
    txOutput: {
        transactionReceipt: TransactionReceipt;
        balanceDeltas: bigint[];
    };
};

export const doAddLiquidityBoosted = async (
    txInput: AddLiquidityBoostedTxInput,
): Promise<AddLiquidityBoostedTxOutput> => {
    const {
        addLiquidityBoosted,
        poolStateWithUnderlyings,
        addLiquidityBoostedInput,
        testAddress,
        client,
        slippage,
        wethIsEth,
    } = txInput;

    const addLiquidityBoostedQueryOutput = await addLiquidityBoosted.query(
        addLiquidityBoostedInput,
        poolStateWithUnderlyings,
    );

    const addLiquidityBoostedBuildInput = {
        ...addLiquidityBoostedQueryOutput,
        slippage,
        wethIsEth,
    };

    const addLiquidityBuildCallOutput = addLiquidityBoosted.buildCall(
        addLiquidityBoostedBuildInput,
    );

    // send add liquidity transaction and check balance changes
    const tokenAmountsForBalanceCheck = [
        ...addLiquidityBoostedQueryOutput.amountsIn,
        addLiquidityBoostedQueryOutput.bptOut,
        // add zero address so we can check for native token balance change
        TokenAmount.fromRawAmount(
            new BaseToken(
                addLiquidityBoostedQueryOutput.chainId,
                zeroAddress,
                18,
            ),
            0n,
        ),
    ];

    const txOutput = await sendTransactionGetBalances(
        tokenAmountsForBalanceCheck.map((t) => t.token.address),
        client,
        testAddress,
        addLiquidityBuildCallOutput.to,
        addLiquidityBuildCallOutput.callData,
        addLiquidityBuildCallOutput.value,
    );

    return {
        addLiquidityBoostedQueryOutput,
        addLiquidityBuildCallOutput,
        tokenAmountsForBalanceCheck,
        txOutput,
    };
};

export const assertAddLiquidityBoostedUnbalanced = (
    output: AddLiquidityBoostedTxOutput,
    wethIsEth: boolean,
) => {
    const {
        addLiquidityBoostedQueryOutput,
        addLiquidityBuildCallOutput,
        tokenAmountsForBalanceCheck,
        txOutput,
    } = output;
    const { chainId, amountsIn, bptOut, protocolVersion } =
        addLiquidityBoostedQueryOutput;
    const { to, value } = addLiquidityBuildCallOutput;
    const { transactionReceipt, balanceDeltas } = txOutput;

    expect(protocolVersion).toEqual(3);
    expect(bptOut.amount > 0n).to.be.true;
    expect(to).to.eq(AddressProvider.CompositeLiquidityRouter(chainId));
    expect(transactionReceipt.status).to.eq('success');

    // add one extra index for native token balance
    const expectedDeltas = tokenAmountsForBalanceCheck.map((t) => t.amount);

    // move native token balance to the extra index if wethIsEth
    if (wethIsEth) {
        const nativeAssetIndex = amountsIn.findIndex((a) =>
            a.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped),
        );
        expectedDeltas[nativeAssetIndex] = 0n;
        expectedDeltas[expectedDeltas.length - 1] = value;
    }

    // check amountsIn against token balance changes
    expect(expectedDeltas.slice(0, -2)).to.deep.eq(balanceDeltas.slice(0, -2));

    // Here we check that output diff is within an acceptable tolerance.
    // !!! This should only be used in the case of buffers as all other cases can be equal
    areBigIntsWithinPercent(
        balanceDeltas[balanceDeltas.length - 2],
        expectedDeltas[expectedDeltas.length - 2],
        0.001,
    );

    // check value against native token balance change
    expect(value === expectedDeltas[expectedDeltas.length - 1]).to.be.true;
};

export const assertAddLiquidityBoostedProportional = (
    output: AddLiquidityBoostedTxOutput,
    wethIsEth: boolean,
) => {
    const {
        addLiquidityBoostedQueryOutput,
        addLiquidityBuildCallOutput,
        tokenAmountsForBalanceCheck,
        txOutput,
    } = output;
    const { chainId, amountsIn, bptOut, protocolVersion } =
        addLiquidityBoostedQueryOutput;
    const { to, value } = addLiquidityBuildCallOutput;
    const { transactionReceipt, balanceDeltas } = txOutput;

    expect(protocolVersion).toEqual(3);
    expect(bptOut.amount > 0n).to.be.true;
    expect(to).to.eq(AddressProvider.CompositeLiquidityRouter(chainId));
    expect(transactionReceipt.status).to.eq('success');

    // add one extra index for native token balance
    const expectedDeltas = tokenAmountsForBalanceCheck.map((t) => t.amount);

    // move native token balance to the extra index if wethIsEth
    if (wethIsEth) {
        const nativeAssetIndex = amountsIn.findIndex((a) =>
            a.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped),
        );
        expectedDeltas[nativeAssetIndex] = 0n;
        expectedDeltas[expectedDeltas.length - 1] = value;
    }

    for (let i = 0; i < expectedDeltas.length - 1; i++) {
        // Here we check that output diff is within an acceptable tolerance.
        // !!! This should only be used in the case of buffers as all other cases can be equal
        areBigIntsWithinPercent(balanceDeltas[i], expectedDeltas[i], 0.001);
    }

    // check value against native token balance change
    expect(value === expectedDeltas[expectedDeltas.length - 1]).to.be.true;
};
