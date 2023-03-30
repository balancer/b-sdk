import { TokenAmount } from './tokenAmount';
import { BasePool } from './pools';

import { ExitPoolRequest, ExitAction, Actions } from '../types';
import { createPublicClient, encodeFunctionData, http } from 'viem';
import { balancerQueriesAbi, vaultAbi } from '../abi/';

const VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
const RELAYER = '';

export class ExitPool {
    public isRelayerExit: boolean;

    public constructor(private actions: Actions[]) {
        if(actions.length === 1) {
            this.isRelayerExit = true;
        }
        this.isRelayerExit = false;
    }

    // Would be used to get expected amounts out from the ExitPath. These can be used to set minAmounts.
    public getOutputAmounts(bptAmountIn: TokenAmount, pools:  BasePool[]): TokenAmount[] {
        /*
        Here we can either calculate amounts using TS maths or run queries against chain
        - Queries:
            - Vault: use balancerHelpers
            - For relayers exits:
            - Currently can't do:
                - static call on Relayer to simulate if user hasn't approved Relayer
                - balancerQueries doesn't currently support but Nico said we should be able to make this work for Vault actions only with a new helper contract
        - TS Maths:
            - Based off `pools` state simulate action steps (updating various pool states) to calculate amounts of tokens returned for bptAmountIn 
            - This NEEDS TS Maths and Pool States
        Is there a preferred option here?
        */
        return [];
    }

    public async query(bptAmountIn: TokenAmount, rpcUrl?: string, block?: bigint): Promise<TokenAmount[]> {
        const client = createPublicClient({
            transport: http(rpcUrl),
        });

        let amount: TokenAmount[] = [];
        if (this.isRelayerExit) {
            const exit = this.actions[0] as ExitAction;
            // TODO - Need to correctly handle userData encoding based off pool type/version
            // const userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(
            //     bptAmountIn,
            //     userDataTokens.indexOf(tokenOut)
            // );
            const request: ExitPoolRequest = {
                assets: exit.assets,
                minAmountsOut: exit.assets.map(() => BigInt(0)), // Can be 0 for query
                userData: `0x0`, // TODO - Use proper encoded data
                toInternalBalance: exit.toInternalBalance,
            }
            const { result } = await client.simulateContract({
                address: '0xE39B5e3B6D74016b2F6A9673D7d7493B6DF549d5',
                abi: balancerQueriesAbi,
                functionName: 'queryExit',
                args: [exit.poolId, exit.sender, exit.recipient, request],
                blockNumber: block,
            });

            // TODO - Correctly handle result to TokenAmounts
        } else {
            // If balancerQueries gets updated to handle chained vault actions we can query here 
            // otherwise we have to do a static call (using a Relayer peek on final exit actions) and user must have approved relayer
        }

        return amount;
    }

    // Constructs final callData setting bpt input and output limits appropriately
    public callData(bptAmountIn: TokenAmount, minAmountsOut: TokenAmount[]): { callData: string, contract: string } {
        let callData: string;
        let contract: string;
        if (this.isRelayerExit) {
            // Vault exit
            const exit = this.actions[0] as ExitAction;
            // TODO - Need to correctly handle userData encoding based off pool type/version
            // const userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(
            //     bptAmountIn,
            //     userDataTokens.indexOf(tokenOut)
            // );
            const request: ExitPoolRequest = {
                assets: exit.assets,
                minAmountsOut: minAmountsOut.map(a => a.amount),
                userData: `0x0`, // TODO - Use proper encoded data
                toInternalBalance: exit.toInternalBalance,
            }
            callData = encodeFunctionData({
                abi: vaultAbi,
                functionName: 'exitPool',
                args: [exit.poolId, exit.sender, exit.recipient, request]
            });
            contract = VAULT;
        } else {
            // Relayer exit - update initial actions with bptAmountIn and final actions with appropriate limits based off minAmountsOut
            // note: must use Relayer V5 if non-Weighted Proportional Exits are being used as earlier versions don't support
            callData = encodeFunctionData({
                abi: relayerAbi,
                functionName: 'multicall',
                args: [],
            });
            contract = RELAYER;
        }
        return { callData, contract };
    }

    // public get priceImpact(): Percent {}
}
