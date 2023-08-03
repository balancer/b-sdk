import { TokenAmount } from './entities';

/*********************** Base Types - used globally across pools *******************/
// Returned from API and used as input
export type PoolState = {
    id: string;
    assets: string[];
    // TODO - Possibly add encoding info here?
};

// Returned from a Query
export type QueryResult = {
    id: string;
    assets: string[];
    joinKind: string;
    bptOut: TokenAmount;
    amountsIn: TokenAmount[];
};

// This will be extended for each pools specific input requirements
export type BaseInput = {
    chainId: number;
    rpcUrl: string;
};

export interface BaseJoin {
    getInstance(): BaseJoin;
    query(input: BaseInput, poolState: PoolState): Promise<QueryResult>;
    getCall(input: QueryResult & { slippage: string }): string; // TODO - Best way to represent slippage?
}

/*********************** Example For Weighted Pool Implementation ******************/
export type ExactIn = BaseInput & {
    tokenAmounts: TokenAmount[];
};

export type ExactOut = BaseInput & {
    bptAmount: TokenAmount;
};

export type Init = BaseInput & {
    tokenAmounts: TokenAmount[];
};

export class JoinWeighted implements BaseJoin {
    // TODO - Probably not needed
    getInstance(): JoinWeighted {
        return new JoinWeighted();
    }

    public async query(
        input: Init | ExactIn | ExactOut,
        poolState: PoolState,
    ): Promise<QueryResult> {
        // TODO - This would need extended to work with relayer

        let swapKind: string;
        let userData = '';
        if ('bptAmount' in input) {
            const exactBptOut = input.bptAmount;
            userData = `Encode userData as exact out [${exactBptOut}]`;
            swapKind = 'ExactOut';
        } else {
            // TODO - If we allow only assets the user wants instead of full pool tokens we need to map them here
            const amountsIn = input.tokenAmounts.map((t) =>
                t.amount.toString(),
            );
            // We can use 0 here as only querying
            const minBpt = '0';
            userData = `Encode userData as exact in [${amountsIn}, ${minBpt}]`;
            swapKind = 'ExactIn';
        }

        const queryArgs = this.getJoinParameters(
            poolState.id,
            poolState.assets,
            '0x',
            '0x',
            Array(poolState.assets.length).fill('0'), // We use 0 as only querying
            userData,
        );

        // Do query and get bptOut/amountsIn

        return {
            joinKind: swapKind,
            id: poolState.id,
            assets: poolState.assets,
            bptOut: {} as TokenAmount,
            amountsIn: [{} as TokenAmount],
        };
    }

    public getCall(
        input: QueryResult & {
            slippage: string;
            sender: string;
            receiver: string;
        },
    ): string {
        let maxAmountsIn: string[];
        let userData: string;
        if (input.joinKind === 'INIT') {
            maxAmountsIn = input.amountsIn.map((a) => a.amount.toString());
            userData = `Encode userData as init [${maxAmountsIn}]`;
        } else if (input.joinKind === 'ExactIn') {
            maxAmountsIn = input.amountsIn.map((a) => a.amount.toString());
            const minBptOut = input.bptOut; // TODO sub slippage here
            userData = `Encode userData as exact in [${maxAmountsIn}, ${minBptOut}]`;
        } else {
            maxAmountsIn = input.amountsIn.map((a) => a.amount.toString()); // TODO add slippage here
            const exactBptOut = input.bptOut;
            userData = `Encode userData as exact out [${exactBptOut}]`;
        }
        const queryArgs = this.getJoinParameters(
            input.id,
            input.assets,
            input.sender,
            input.receiver,
            maxAmountsIn,
            userData,
        );
        // Encode data
        return 'thisisanencodedjoin';
    }

    private getJoinParameters(
        poolId: string,
        assets: string[],
        sender: string,
        recipient: string,
        maxAmountsIn: string[],
        userData: String,
    ) {
        const joinPoolRequest = {
            assets,
            maxAmountsIn,
            userData,
            fromInternalBalance: false,
        };

        return {
            poolId,
            sender,
            recipient,
            joinPoolRequest,
        };
    }
}
/***********************************************************************************/

/*********************** Basic Helper to get join class from pool type *************/
export type JoinConfig = {
    customPoolFactories?: Record<string, BaseJoin>;
};

export class JoinHelper {
    private readonly poolFactories: Record<string, BaseJoin> = {};

    constructor({ customPoolFactories = {} }: JoinConfig) {
        this.poolFactories['weighted'] = new JoinWeighted();
        this.poolFactories = { ...customPoolFactories };
        // custom pool factories take precedence over base factories
    }

    public async getJoin(poolType: string): Promise<BaseJoin> {
        // TODO - Need to parse
        return this.poolFactories[poolType];
    }
}

/*********************** Mock To Represent API Requirements **********************/
type ApiResponse = {
    id: string;
    type: string;
    assets: string[];
};

export class MockApi {
    public async getPool(id: string): Promise<ApiResponse> {
        return {
            id,
            type: 'Weighted',
            assets: ['0xtoken1Addr', '0xtoken2Addr'],
        };
    }
}

const api = new MockApi();
/******************************************************************************/

/*********************** Example of Possible Flow *****************************/

const joinHelper = new JoinHelper({});
const poolId = '0xpoolId';
// Calls API
const poolFromApi = await api.getPool(poolId);
const join = await joinHelper.getJoin(poolFromApi.type);
const queryInput: ExactIn = {
    tokenAmounts: ['amount1', 'amount2'],
};
const queryResult = await join.query(queryInput, poolFromApi);
const call = await join.getCall({ ...queryResult, slippage: '10' });
console.log(call); // Make call
/******************************************************************************/
