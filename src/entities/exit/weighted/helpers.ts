import { Address } from '../../../types';
import { ExitPoolRequest } from '../types';

export function getExitParameters({
    poolId,
    assets,
    sender,
    recipient,
    minAmountsOut,
    userData,
    toInternalBalance,
}: {
    poolId: Address;
    assets: Address[];
    sender: Address;
    recipient: Address;
    minAmountsOut: bigint[];
    userData: Address;
    toInternalBalance: boolean;
}) {
    const exitPoolRequest: ExitPoolRequest = {
        assets, // with BPT
        minAmountsOut, // with BPT
        userData, // wihtout BPT
        toInternalBalance,
    };

    return [poolId, sender, recipient, exitPoolRequest] as const;
}
