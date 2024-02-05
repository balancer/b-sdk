import { encodeAbiParameters } from 'viem';

const RECOVERY_REMOVE_LIQUIDITY_CODE = 255n;

export const encodeRemoveLiquidityRecovery = (bptAmountIn) => {
    return encodeAbiParameters(
        [{ type: 'uint256' }, { type: 'uint256' }],
        [RECOVERY_REMOVE_LIQUIDITY_CODE, bptAmountIn],
    );
};
