import { PoolDataProvider, RawPool } from '../../src/poolData/types';

export class MockPoolDataService implements PoolDataProvider {
    constructor(private pools: RawPool[] = []) {}

    public async getPools(): Promise<RawPool[]> {
        return this.pools;
    }

    public setPools(pools: RawPool[]): void {
        this.pools = pools;
    }
}

export const mockPoolDataService = new MockPoolDataService();
