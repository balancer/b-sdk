import { PoolType } from '../types';

// map pool type from the api to the sdk
const poolTypeMap = {
    WEIGHTED: PoolType.Weighted,
    COMPOSABLE_STABLE: PoolType.ComposableStable,
    GYRO3: PoolType.Gyro3,
    GYRO2: PoolType.Gyro2,
    GYROE: PoolType.GyroE,
};

export const mapPoolType = (type: string): PoolType => {
    const supportedPoolTypes = Object.keys(poolTypeMap);

    if (!supportedPoolTypes.includes(type)) {
        throw new Error(
            `Unsupported pool type ${type} - supported types are ${supportedPoolTypes.join(
                ', ',
            )}`,
        );
    }

    return poolTypeMap[type];
};
