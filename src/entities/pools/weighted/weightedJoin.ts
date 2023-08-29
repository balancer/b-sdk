import { BaseJoin, JoinInput, JoinQueryResult, PoolState } from '..';
import { Address } from '../../../types';
import { ZERO_ADDRESS, getPoolAddress } from '../../../utils';
import { TokenAmount } from '../../tokenAmount';

export class JoinWeighted implements BaseJoin {
    // TODO - Probably not needed
    getInstance(): JoinWeighted {
        return new JoinWeighted();
    }

    public async query(
        input: JoinInput,
        poolState: PoolState,
    ): Promise<JoinQueryResult> {
        // TODO - This would need extended to work with relayer

        this.checkInputs(input, poolState);

        // infer join kind by input tokens
        const poolAddress = getPoolAddress(poolState.id) as Address;
        const joinKind = this.getJoinKind(input, poolAddress);

        // Initialize join parameters
        let amountsIn = Array(poolState.assets.length).fill('0');
        let userData = '';

        switch (joinKind) {
            case 'Init': {
                amountsIn = this.getAmountsIn(input, poolState.assets);
                userData = `Encode userData as Init [${amountsIn}]`;
                break;
            }
            case 'GivenIn': {
                amountsIn = this.getAmountsIn(input, poolState.assets);
                const bptOut = '0';
                userData = `Encode userData as GivenIn [${amountsIn}, ${bptOut}]`;
                break;
            }
            case 'GivenOut': {
                const bptOut = input.tokenAmounts[0].amount.toString();
                userData = `Encode userData as exact out [${bptOut}]`;
                break;
            }
            default:
                throw new Error('Invalid join kind');
        }

        const queryArgs = this.getJoinParameters({
            poolId: poolState.id,
            assets: poolState.assets,
            sender: ZERO_ADDRESS,
            recipient: ZERO_ADDRESS,
            maxAmountsIn: amountsIn,
            userData,
        });

        // Do query and get bptOut/amountsIn
        console.log(queryArgs);

        return {
            joinKind,
            id: poolState.id,
            assets: poolState.assets,
            bptOut: {} as TokenAmount, // TODO: update with query result if needed
            amountsIn: [{} as TokenAmount], // TODO: update with query result if needed
        };
    }

    public getCall(
        input: JoinQueryResult & {
            slippage: string;
            sender: string;
            receiver: string;
        },
    ): { call: string; to: string; value: string } {
        let maxAmountsIn: string[];
        let userData: string;

        switch (input.joinKind) {
            case 'Init': {
                maxAmountsIn = input.amountsIn.map((a) => a.amount.toString());
                userData = `Encode userData as init [${maxAmountsIn}]`;
                break;
            }
            case 'GivenIn': {
                maxAmountsIn = input.amountsIn.map((a) => a.amount.toString());
                const minBptOut = input.bptOut; // TODO sub slippage here
                userData = `Encode userData as exact in [${maxAmountsIn}, ${minBptOut}]`;
                break;
            }
            case 'GivenOut': {
                maxAmountsIn = input.amountsIn.map((a) => a.amount.toString()); // TODO add slippage here
                const exactBptOut = input.bptOut;
                userData = `Encode userData as exact out [${exactBptOut}]`;
                break;
            }
            default:
                throw new Error('Invalid join kind');
        }

        const queryArgs = this.getJoinParameters({
            poolId: input.id,
            assets: input.assets,
            sender: input.sender,
            recipient: input.receiver,
            maxAmountsIn,
            userData,
        });

        const call = JSON.stringify(queryArgs); // TODO - Encode data

        // Encode data
        return {
            call,
            to: '0xbalancerVaultAddress',
            value: '0', // TODO: ETH value when joining with ETH
        };
    }

    private getJoinParameters({
        poolId,
        assets,
        sender,
        recipient,
        maxAmountsIn,
        userData,
    }: {
        poolId: string;
        assets: string[];
        sender: string;
        recipient: string;
        maxAmountsIn: string[];
        userData: string;
    }) {
        const joinPoolRequest = {
            assets, // with BPT
            maxAmountsIn, // with BPT
            userData, // wihtout BPT
            fromInternalBalance: false,
        };

        return {
            poolId,
            sender,
            recipient,
            joinPoolRequest,
        };
    }

    private checkInputs(input: JoinInput, poolState: PoolState) {
        const tokensIn = input.tokenAmounts.map((t) => t.token.address);
        if (input.tokenAmounts.length === 0) {
            throw new Error('Must specify at least one input');
        } else if (tokensIn.some((t) => !poolState.assets.includes(t))) {
            throw new Error('Input token not in pool');
        } else if (tokensIn.includes(getPoolAddress(poolState.id) as Address)) {
            if (tokensIn.length > 1) {
                throw new Error('Cannot join with BPT and other tokens');
            } else if (input.isInit) {
                throw new Error('Cannot init with BPT');
            }
        }
    }

    private getJoinKind(input: JoinInput, poolAddress: Address): string {
        const tokensIn = input.tokenAmounts.map((t) => t.token.address);
        if (tokensIn.includes(poolAddress)) {
            return 'GivenOut';
        } else {
            return input.isInit ? 'Init' : 'GivenIn';
        }
    }

    private getAmountsIn(input: JoinInput, poolAssets: string[]): string[] {
        return poolAssets.map((asset) => {
            let amountIn = '0';
            const tokenIn = input.tokenAmounts.find(
                (t) => t.token.address === asset,
            );
            if (tokenIn) {
                amountIn = tokenIn.amount.toString();
            }
            return amountIn;
        });
    }
}
