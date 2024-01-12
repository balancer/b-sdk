import { Address } from '../..';
import { BuildReturn, Results } from './onChainPoolDataCallsV2';

export const onChainPoolDataCallsV3 = (
    poolType: string,
    poolTypeVersion: number,
    vault: Address,
): {
    count: number;
    build: (id: string, poolType: string, vault: Address) => BuildReturn[];
    parse: (results: Results, shift: number) => any;
} => {
    throw new Error(`Not implemented ${poolType} ${poolTypeVersion} ${vault}`);
};
