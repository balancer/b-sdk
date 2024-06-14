import { PoolType } from '../types';

// map pool type from the api to the sdk
const poolTypeMap = {
    COMPOSABLE_STABLE: PoolType.ComposableStable,
    GYRO: PoolType.Gyro2,
    GYRO3: PoolType.Gyro3,
    GYROE: PoolType.GyroE,
    META_STABLE: PoolType.MetaStable,
    STABLE: PoolType.Stable,
    WEIGHTED: PoolType.Weighted,
    COW_AMM: PoolType.CowAmm,
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
