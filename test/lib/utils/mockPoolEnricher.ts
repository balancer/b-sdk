import { AdditionalPoolData, PoolDataEnricher, RawPool } from '../../../src';

export class MockPoolDataEnricher implements PoolDataEnricher {
    async fetchAdditionalPoolData(): Promise<AdditionalPoolData[]> {
        return [];
    }

    enrichPoolsWithData(pools: RawPool[]): RawPool[] {
        return pools;
    }
}
