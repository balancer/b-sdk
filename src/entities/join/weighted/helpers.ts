import { Address } from '../../../types';

export function getJoinParameters({
    poolId,
    assets,
    sender,
    recipient,
    maxAmountsIn,
    userData,
}: {
    poolId: Address;
    assets: readonly Address[];
    sender: Address;
    recipient: Address;
    maxAmountsIn: readonly bigint[];
    userData: Address;
}) {
    const joinPoolRequest = {
        assets, // with BPT
        maxAmountsIn, // with BPT
        userData, // wihtout BPT
        fromInternalBalance: false,
    };

    return [poolId, sender, recipient, joinPoolRequest] as const;
}
