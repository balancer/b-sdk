import { Address, Hex, SwapKind } from '@/types';
import { Client, PublicActions, WalletActions } from 'viem';
import {
    AllowanceTransfer,
    Permit2Batch,
    PermitDetails,
} from './allowanceTransfer';
import { BALANCER_BATCH_ROUTER, BALANCER_ROUTER, PERMIT2 } from '@/utils';
import {
    MaxAllowanceExpiration,
    MaxAllowanceTransferAmount,
    MaxSigDeadline,
} from './constants';
import { AddLiquidityBaseBuildCallInput } from '../addLiquidity/types';
import {
    ExactInQueryOutput,
    ExactOutQueryOutput,
    SwapBuildCallInputBase,
} from '../swap';
import { getLimitAmount } from '../swap/limits';
import { TokenAmount } from '../tokenAmount';
import { permit2Abi } from '@/abi';

export * from './allowanceTransfer';
export * from './constants';

export type Permit2 = {
    batch: Permit2Batch;
    signature: Hex;
};

export class Permit2Helper {
    static async signAddLiquidityApproval(
        input: AddLiquidityBaseBuildCallInput & {
            client: Client & WalletActions & PublicActions;
            owner: Address;
        },
    ): Promise<Permit2> {
        const spender = BALANCER_ROUTER[input.chainId];
        const details: PermitDetails[] = [];
        for (const amountIn of input.amountsIn) {
            details.push(
                await getDetails(
                    input.client,
                    amountIn.token.address,
                    input.owner,
                    spender,
                    amountIn.amount,
                ),
            );
        }
        return signPermit2(input.client, input.owner, spender, details);
    }

    static async signSwapApproval(
        input: SwapBuildCallInputBase & {
            client: Client & WalletActions & PublicActions;
            owner: Address;
        },
    ): Promise<Permit2> {
        // get maxAmountIn
        let maxAmountIn: TokenAmount;
        if (input.queryOutput.swapKind === SwapKind.GivenIn) {
            const queryOutput = input.queryOutput as ExactInQueryOutput;
            maxAmountIn = queryOutput.amountIn;
        } else {
            const queryOutput = input.queryOutput as ExactOutQueryOutput;
            maxAmountIn = getLimitAmount(
                input.slippage,
                SwapKind.GivenOut,
                queryOutput.expectedAmountIn,
            );
        }

        const chainId = await input.client.getChainId();
        const spender = input.queryOutput.pathAmounts
            ? BALANCER_BATCH_ROUTER[chainId]
            : BALANCER_ROUTER[chainId];

        // build permit details
        const details: PermitDetails[] = [
            await getDetails(
                input.client,
                maxAmountIn.token.address,
                input.owner,
                spender,
                maxAmountIn.amount,
            ),
        ];

        // sign permit2
        const permit2 = await signPermit2(
            input.client,
            input.owner,
            spender,
            details,
        );

        return permit2;
    }
}

const signPermit2 = async (
    client: Client & WalletActions,
    owner: Address,
    spender: Address,
    details: PermitDetails[],
    sigDeadline = MaxSigDeadline,
): Promise<Permit2> => {
    const batch: Permit2Batch = {
        details,
        spender,
        sigDeadline,
    };

    const chainId = await client.getChainId();
    const { domain, types, values } = AllowanceTransfer.getPermitData(
        batch,
        PERMIT2[chainId],
        chainId,
    );

    const signature = await client.signTypedData({
        account: owner,
        message: {
            ...values,
        },
        domain,
        primaryType: 'PermitBatch',
        types,
    });
    return { batch, signature };
};

const getDetails = async (
    client: Client & PublicActions,
    token: Address,
    owner: Address,
    spender: Address,
    amount = MaxAllowanceTransferAmount,
    expiration = Number(MaxAllowanceExpiration),
    nonce?: number,
) => {
    let _nonce: number;
    if (nonce === undefined) {
        _nonce = await getNonce(client, token, owner, spender);
    } else {
        _nonce = nonce;
    }
    const details: PermitDetails = {
        token,
        amount,
        expiration,
        nonce: _nonce,
    };

    return details;
};

const getNonce = async (
    client: Client & PublicActions,
    token: Address,
    owner: Address,
    spender: Address,
): Promise<number> => {
    const chainId = await client.getChainId();
    const result = await client.readContract({
        abi: permit2Abi,
        address: PERMIT2[chainId],
        functionName: 'allowance',
        args: [owner, token, spender],
    });
    const nonce = result[1];

    return nonce;
};
