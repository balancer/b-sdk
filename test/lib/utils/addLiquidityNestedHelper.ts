import { Address, TransactionReceipt } from 'viem';
import {
    AddLiquidityNested,
    AddLiquidityNestedInput,
    Relayer,
    Slippage,
    TokenAmount,
    replaceWrapped,
} from '@/entities';
import { BALANCER_RELAYER, NATIVE_ASSETS } from '@/utils';
import { AddLiquidityNestedTxInput } from './types';
import { sendTransactionGetBalances } from './helper';

export const assertResults = (
    transactionReceipt: TransactionReceipt,
    bptOut: TokenAmount,
    amountsIn: {
        address: Address;
        rawAmount: bigint;
    }[],
    balanceDeltas: bigint[],
    slippage: Slippage,
    minBptOut: bigint,
    chainId: number,
    value?: bigint,
    wethIsEth = false,
) => {
    expect(transactionReceipt.status).to.eq('success');
    expect(bptOut.amount > 0n).to.be.true;
    const expectedDeltas = [
        ...amountsIn.map((a) => a.rawAmount),
        bptOut.amount,
    ];
    expect(expectedDeltas).to.deep.eq(balanceDeltas);
    const expectedMinBpt = slippage.applyTo(bptOut.amount, -1);
    expect(expectedMinBpt).to.deep.eq(minBptOut);

    const wrappedNativeAsset = amountsIn.find(
        (a) => a.address === NATIVE_ASSETS[chainId].wrapped,
    );
    if (wrappedNativeAsset && wethIsEth) {
        expect(value).to.eq(wrappedNativeAsset.rawAmount);
    } else {
        expect(value).to.eq(undefined || 0n);
    }
};

export const doAddLiquidityNested = async ({
    nestedPoolState,
    amountsIn,
    chainId,
    rpcUrl,
    testAddress,
    client,
    wethIsEth = false,
}: AddLiquidityNestedTxInput) => {
    // setup add liquidity helper
    const addLiquidityNested = new AddLiquidityNested();

    const addLiquidityInput: AddLiquidityNestedInput = {
        amountsIn,
        chainId,
        rpcUrl,
        accountAddress: testAddress,
    };
    const queryOutput = await addLiquidityNested.query(
        addLiquidityInput,
        nestedPoolState,
    );

    // build add liquidity call with expected minBpOut based on slippage
    const slippage = Slippage.fromPercentage('1'); // 1%

    const signature = await Relayer.signRelayerApproval(
        BALANCER_RELAYER[chainId],
        testAddress,
        client,
    );

    const { call, to, value, minBptOut } = addLiquidityNested.buildCall({
        ...queryOutput,
        slippage,
        sender: testAddress,
        recipient: testAddress,
        relayerApprovalSignature: signature,
        wethIsEth,
    });

    let tokensIn = queryOutput.amountsIn.map((a) => a.token);
    if (wethIsEth) {
        tokensIn = replaceWrapped(tokensIn, chainId);
    }

    // send add liquidity transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                ...tokensIn.map((t) => t.address),
                queryOutput.bptOut.token.address,
            ],
            client,
            testAddress,
            to,
            call,
            value,
        );
    return {
        transactionReceipt,
        balanceDeltas,
        bptOut: queryOutput.bptOut,
        minBptOut,
        slippage,
        value,
    };
};
