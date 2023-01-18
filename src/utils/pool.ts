/**
 * Extracts a pool's address from its poolId
 * @param poolId - a bytes32 string of the pool's ID
 * @returns the pool's address
 */
export const getPoolAddress = (poolId: string): string => {
    if(poolId.length !== 66) throw new Error('Invalid poolId length');
    return poolId.slice(0, 42);
};
