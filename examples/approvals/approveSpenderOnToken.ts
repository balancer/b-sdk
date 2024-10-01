import { erc20Abi, MaxUint256 } from '../../src';

import { Address } from 'viem';

export const approveSpenderOnToken = async (
    client: any,
    account: Address,
    token: Address,
    spender: Address,
) => {
    await client.writeContract({
        account,
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, MaxUint256],
    });
    console.log('Approved spender on token');
};
