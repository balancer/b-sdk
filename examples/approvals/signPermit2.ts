import {
    AllowanceTransfer,
    Permit2Batch,
    PermitDetails,
    PERMIT2,
    BALANCER_ROUTER,
    MaxSigDeadline,
    ChainId,
} from '../../src';

import { Address } from 'viem';

export const signPermit2 = async (
    client: any,
    account: Address,
    chainId: ChainId,
    details: PermitDetails[],
) => {
    const spender = BALANCER_ROUTER[chainId];

    const batch: Permit2Batch = {
        details,
        spender,
        sigDeadline: MaxSigDeadline,
    };

    const { domain, types, values } = AllowanceTransfer.getPermitData(
        batch,
        PERMIT2[chainId],
        chainId,
    );

    await client.impersonateAccount({ address: account });

    const signature = await client.signTypedData({
        account: account,
        message: { ...values },
        domain,
        primaryType: 'PermitBatch',
        types,
    });

    return { signature, batch };
};
