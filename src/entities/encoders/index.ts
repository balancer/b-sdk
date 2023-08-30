import { SupportedRawPoolTypes } from '../../data/types';
import { WeightedPoolEncoder } from './weighted';

export const getEncoder = (
    poolType: SupportedRawPoolTypes | string,
): typeof WeightedPoolEncoder | undefined => {
    switch (poolType) {
        case 'Weighted':
            return WeightedPoolEncoder;
        default:
            return undefined;
    }
};
