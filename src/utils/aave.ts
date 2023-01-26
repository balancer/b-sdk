import { SECONDS_PER_YEAR } from './constants';
import { RAY, WAD } from './math';

// Returns a wad (18 decimals) rate
export const getNormalizedIncome = (liquidityIndex: bigint, currentLiquidityRate: bigint, lastUpdateTimestamp: bigint): bigint => {
    return calculateLinearInterest(currentLiquidityRate, lastUpdateTimestamp) * liquidityIndex / RAY / (RAY / WAD);
}

export const calculateLinearInterest = (rate: bigint, lastUpdateTimestamp: bigint): bigint => {
    const timeDifference = BigInt(Math.floor(new Date().getTime() / 1000)) - lastUpdateTimestamp;
    return ((rate * timeDifference) / SECONDS_PER_YEAR) + RAY;
}