import { Address, TestActions } from 'viem';
import {
    ChainId,
    Slippage,
    Swap,
    ZERO_ADDRESS,
    SwapBuildOutputExactOut,
    NATIVE_ASSETS,
    SwapBuildOutputExactIn,
    SwapBuildCallInput,
    SwapKind,
    Permit2Helper,
    ViemClient,
} from '../../../src';
import { sendTransactionGetBalances } from '../../lib/utils/helper';

// Helper function to check if two BigInts are within a given percentage
function areBigIntsWithinPercent(
    value1: bigint,
    value2: bigint,
    percent: number,
): boolean {
    if (percent < 0) {
        throw new Error('Percent must be non-negative');
    }
    const difference = value1 > value2 ? value1 - value2 : value2 - value1;
    const percentFactor = BigInt(Math.floor(percent * 1e8));
    const tolerance = (value2 * percentFactor) / BigInt(1e10);
    return difference <= tolerance;
}

export async function assertSwapExactIn({
    contractToCall,
    client,
    rpcUrl,
    chainId,
    swap,
    wethIsEth,
    usePermit2Signatures = false,
    outputTest = {
        testExactOutAmount: true,
        percentage: 0,
    },
}: {
    contractToCall: Address;
    client: ViemClient & TestActions;
    rpcUrl: string;
    chainId: ChainId;
    swap: Swap;
    wethIsEth: boolean;
    usePermit2Signatures?: boolean;
    outputTest?: {
        testExactOutAmount: boolean;
        percentage: number;
    };
}) {
    const testAddress = (await client.getAddresses())[0];
    const slippage = Slippage.fromPercentage('0.1');
    const deadline = 999999999999999999n;

    const expected = await swap.query(rpcUrl);
    if (expected.swapKind !== SwapKind.GivenIn) throw Error('Expected GivenIn');
    expect(expected.expectedAmountOut.amount > 0n).to.be.true;

    let buildCallInput: SwapBuildCallInput = {
        slippage,
        deadline,
        queryOutput: expected,
        wethIsEth,
    };

    if (swap.protocolVersion === 2) {
        buildCallInput = {
            ...buildCallInput,
            sender: testAddress,
            recipient: testAddress,
        };
    }

    let call: SwapBuildOutputExactIn;
    if (usePermit2Signatures) {
        const permit2 = await Permit2Helper.signSwapApproval({
            ...buildCallInput,
            client,
            owner: testAddress,
        });

        call = swap.buildCallWithPermit2(
            buildCallInput,
            permit2,
        ) as SwapBuildOutputExactIn;
    } else {
        call = swap.buildCall(buildCallInput) as SwapBuildOutputExactIn;
    }

    const isEthInput =
        wethIsEth &&
        swap.inputAmount.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped);

    const expectedValue = isEthInput ? swap.inputAmount.amount : 0n;

    expect(call.to).to.eq(contractToCall);
    expect(call.value).to.eq(expectedValue);
    // send swap transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                ZERO_ADDRESS,
                swap.inputAmount.token.address,
                swap.outputAmount.token.address,
            ],
            client,
            testAddress,
            call.to,
            call.callData,
            call.value,
        );
    expect(transactionReceipt.status).to.eq('success');

    const isEthOutput =
        wethIsEth &&
        swap.outputAmount.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped);
    let expectedEthDelta = 0n;
    let expectedTokenInDelta = swap.inputAmount.amount;
    let expectedTokenOutDelta = expected.expectedAmountOut.amount;
    if (isEthInput) {
        // Should send eth instead of tokenIn (weth)
        expectedEthDelta = swap.inputAmount.amount;
        expectedTokenInDelta = 0n;
    }
    if (isEthOutput) {
        // should receive eth instead of tokenOut (weth)
        expectedEthDelta = expected.expectedAmountOut.amount;
        expectedTokenOutDelta = 0n;
    }

    if (outputTest.testExactOutAmount)
        expect(balanceDeltas).to.deep.eq([
            expectedEthDelta,
            expectedTokenInDelta,
            expectedTokenOutDelta,
        ]);
    else {
        // Here we check that output diff is within an acceptable tolerance.
        // !!! This should only be used in the case of buffers as all other cases can be equal
        expect(balanceDeltas[0]).to.eq(expectedEthDelta);
        expect(balanceDeltas[1]).to.eq(expectedTokenInDelta);
        expect(
            areBigIntsWithinPercent(
                balanceDeltas[2],
                expectedTokenOutDelta,
                outputTest.percentage,
            ),
        ).toBe(true);
    }
}

export async function assertSwapExactOut({
    contractToCall,
    client,
    rpcUrl,
    chainId,
    swap,
    wethIsEth,
    usePermit2Signatures = false,
    inputTest = {
        testExactInAmount: true,
        percentage: 0,
    },
}: {
    contractToCall: Address;
    client: ViemClient & TestActions;
    rpcUrl: string;
    chainId: ChainId;
    swap: Swap;
    wethIsEth: boolean;
    usePermit2Signatures?: boolean;
    inputTest?: {
        testExactInAmount: boolean;
        percentage: number;
    };
}) {
    const testAddress = (await client.getAddresses())[0];
    const slippage = Slippage.fromPercentage('0.1');
    const deadline = 999999999999999999n;

    const expected = await swap.query(rpcUrl);
    if (expected.swapKind !== SwapKind.GivenOut)
        throw Error('Expected GivenOut');

    let buildCallInput: SwapBuildCallInput = {
        slippage,
        deadline,
        queryOutput: expected,
        wethIsEth,
    };

    if (swap.protocolVersion === 2) {
        buildCallInput = {
            ...buildCallInput,
            sender: testAddress,
            recipient: testAddress,
        };
    }
    expect(expected.expectedAmountIn.amount > 0n).to.be.true;

    let call: SwapBuildOutputExactOut;
    if (usePermit2Signatures) {
        const permit2 = await Permit2Helper.signSwapApproval({
            ...buildCallInput,
            client,
            owner: testAddress,
        });

        call = swap.buildCallWithPermit2(
            buildCallInput,
            permit2,
        ) as SwapBuildOutputExactOut;
    } else {
        call = swap.buildCall(buildCallInput) as SwapBuildOutputExactOut;
    }

    const isEthInput =
        wethIsEth &&
        swap.inputAmount.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped);

    // Caller must send amountIn + slippage if ETH
    const expectedValue = isEthInput ? call.maxAmountIn.amount : 0n;

    expect(call.to).to.eq(contractToCall);
    expect(call.value).to.eq(expectedValue);
    // send swap transaction and check balance changes
    const { transactionReceipt, balanceDeltas } =
        await sendTransactionGetBalances(
            [
                ZERO_ADDRESS,
                swap.inputAmount.token.address,
                swap.outputAmount.token.address,
            ],
            client,
            testAddress,
            call.to,
            call.callData,
            call.value,
        );

    expect(transactionReceipt.status).to.eq('success');

    const isEthOutput =
        wethIsEth &&
        swap.outputAmount.token.isSameAddress(NATIVE_ASSETS[chainId].wrapped);
    let expectedEthDelta = 0n;
    let expectedTokenInDelta = expected.expectedAmountIn.amount;
    let expectedTokenOutDelta = swap.outputAmount.amount;
    if (isEthInput) {
        // Should send eth instead of tokenIn (weth)
        expectedEthDelta = expected.expectedAmountIn.amount;
        expectedTokenInDelta = 0n;
    }
    if (isEthOutput) {
        // should receive eth instead of tokenOut (weth)
        expectedEthDelta = swap.outputAmount.amount;
        expectedTokenOutDelta = 0n;
    }

    if (inputTest.testExactInAmount)
        expect(balanceDeltas).to.deep.eq([
            expectedEthDelta,
            expectedTokenInDelta,
            expectedTokenOutDelta,
        ]);
    else {
        // Here we check that output diff is within an acceptable tolerance.
        // !!! This should only be used in the case of buffers as all other cases can be equal
        expect(balanceDeltas[0]).to.eq(expectedEthDelta);
        expect(balanceDeltas[2]).to.eq(expectedTokenOutDelta);
        expect(
            areBigIntsWithinPercent(
                balanceDeltas[1],
                expectedTokenInDelta,
                inputTest.percentage,
            ),
        ).toBe(true);
    }
}
