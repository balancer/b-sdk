import { SupportedRawPoolTypes } from '../../data/types';
import { WeightedEncoder } from './weighted';

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
