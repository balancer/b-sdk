import { encodeAbiParameters } from 'viem';
import { SupportedRawPoolTypes } from '../../data/types';
import { WeightedEncoder } from './weighted';

export * from './weighted';

const RECOVERY_REMOVE_LIQUIDITY_CODE = 255n;

export const getEncoder = (
    poolType: SupportedRawPoolTypes | string,
): typeof WeightedEncoder | undefined => {
    switch (poolType) {
        case 'Weighted':
            return WeightedEncoder;
        default:
            return undefined;
    }
};

export const encodeRemoveLiquidityRecovery = (bptAmountIn) => {
    return encodeAbiParameters(
        [{ type: 'uint256' }, { type: 'uint256' }],
        [RECOVERY_REMOVE_LIQUIDITY_CODE, bptAmountIn],
    );
};
