import {
    AllowanceTransfer,
    Permit2Batch,
    PermitDetails,
    PERMIT2,
    BALANCER_ROUTER,
    MaxSigDeadline,
    ChainId,
} from '../../src';

export const signPermit2 = async (client, details: PermitDetails[]) => {
    const chainId = ChainId.SEPOLIA;

    const batch: Permit2Batch = {
        details,
        spender: BALANCER_ROUTER[chainId],
        sigDeadline: MaxSigDeadline,
    };

    const { domain, types, values } = AllowanceTransfer.getPermitData(
        batch,
        PERMIT2[chainId],
        chainId,
    );

    const signature = await client.signTypedData({
        message: { ...values },
        domain,
        primaryType: 'PermitBatch',
        types,
    });

    return { signature, batch };
};
