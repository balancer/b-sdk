import { weightedPoolAbi_V3 } from '@/abi';
import { Hex } from '@/types';
import {
    BALANCER_COMPOSITE_LIQUIDITY_ROUTER,
    BALANCER_ROUTER,
    ChainId,
    MAX_UINT256,
    PublicWalletClient,
} from '@/utils';
import { getNonce } from './helper';
import { RemoveLiquidityBaseBuildCallInput } from '../removeLiquidity/types';
import { getAmountsCall } from '../removeLiquidity/helper';
import { TokenAmount } from '../tokenAmount';

type PermitApproval = {
    /** Address of the token to approve */
    token: Hex;
    /** Owner of the tokens. Usually the currently connected address. */
    owner: Hex;
    /** Address to grant allowance to */
    spender: Hex;
    /** Amount to approve */
    amount: bigint;
    /** Nonce of the permit */
    nonce: bigint;
    /** Expiration of this approval, in SECONDS */
    deadline: bigint;
};

export type Permit = {
    batch: PermitApproval[];
    signatures: Hex[];
};

export class PermitHelper {
    static signRemoveLiquidityApproval = async (
        input: RemoveLiquidityBaseBuildCallInput & {
            client: PublicWalletClient;
            owner: Hex;
            nonce?: bigint;
            deadline?: bigint;
        },
    ): Promise<Permit> => {
        const amounts = getAmountsCall(input);
        const nonce =
            input.nonce ??
            (await getNonce(
                input.client,
                input.bptIn.token.address,
                input.owner,
            ));
        const { permitApproval, permitSignature } = await signPermit(
            input.client,
            input.bptIn.token.address,
            input.owner,
            BALANCER_ROUTER[input.chainId],
            nonce,
            amounts.maxBptAmountIn,
            input.deadline,
        );
        return { batch: [permitApproval], signatures: [permitSignature] };
    };

    static signRemoveLiquidityNestedApproval = async (input: {
        bptAmountIn: TokenAmount;
        chainId: ChainId;
        client: PublicWalletClient;
        owner: Hex;
        nonce?: bigint;
        deadline?: bigint;
    }): Promise<Permit> => {
        const nonce =
            input.nonce ??
            (await getNonce(
                input.client,
                input.bptAmountIn.token.address,
                input.owner,
            ));
        const { permitApproval, permitSignature } = await signPermit(
            input.client,
            input.bptAmountIn.token.address,
            input.owner,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[input.chainId],
            nonce,
            input.bptAmountIn.amount, // maxBptIn
            input.deadline,
        );
        return { batch: [permitApproval], signatures: [permitSignature] };
    };

    static signRemoveLiquidityBoostedApproval = async (
        input: RemoveLiquidityBaseBuildCallInput & {
            client: PublicWalletClient;
            owner: Hex;
            nonce?: bigint;
            deadline?: bigint;
        },
    ): Promise<Permit> => {
        const amounts = getAmountsCall(input);
        const nonce =
            input.nonce ??
            (await getNonce(
                input.client,
                input.bptIn.token.address,
                input.owner,
            ));
        const { permitApproval, permitSignature } = await signPermit(
            input.client,
            input.bptIn.token.address,
            input.owner,
            BALANCER_COMPOSITE_LIQUIDITY_ROUTER[input.chainId],
            nonce,
            amounts.maxBptAmountIn,
            input.deadline,
        );
        return { batch: [permitApproval], signatures: [permitSignature] };
    };
}

/**
 * Signs a permit for a given ERC-2612 ERC20 token using the specified parameters.
 *
 * @param { Client & WalletActions & PublicActions } client - Wallet client to invoke for signing the permit message
 */
const signPermit = async (
    client: PublicWalletClient,
    token: Hex,
    owner: Hex,
    spender: Hex,
    nonce: bigint,
    amount = MAX_UINT256,
    deadline = MAX_UINT256,
): Promise<{
    permitApproval: PermitApproval;
    permitSignature: Hex;
}> => {
    const types = {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    };

    const message = {
        owner,
        spender,
        value: amount,
        nonce,
        deadline,
    };

    const domain = await getDomain(client, token);
    const permitSignature = await client.signTypedData({
        account: owner,
        message,
        domain,
        primaryType: 'Permit',
        types,
    });
    const permitApproval = {
        token,
        owner,
        spender,
        amount,
        nonce,
        deadline,
    };
    return { permitApproval, permitSignature };
};

const getDomain = async (client: PublicWalletClient, token: Hex) => {
    const [, name, version, chainId, verifyingContract, , ,] =
        await client.readContract({
            abi: weightedPoolAbi_V3,
            address: token,
            functionName: 'eip712Domain',
            args: [],
        });

    const domain = {
        name,
        version,
        chainId: Number(chainId),
        verifyingContract,
    };

    return domain;
};
