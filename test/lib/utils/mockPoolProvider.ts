import { GetPoolsResponse, PoolDataProvider, RawPool } from '../../../src';

export class MockPoolProvider implements PoolDataProvider {
    constructor(private pools: RawPool[]) {}

    getPools(): Promise<GetPoolsResponse> {
        return Promise.resolve({ pools: this.pools });
    }
}
