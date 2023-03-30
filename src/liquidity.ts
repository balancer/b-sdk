import { HexString, ExitAction, Actions } from './types';
import { BasePool, ExitPool } from './entities';

/*
Example flow:

const liquidity = new Liquidity(poolId, pools);

const liquidity = new Liquidity(poolId, pools);

const exitTokens = liquidity.poolTokens();

const exit = liquidity.getExit([exitTokens[0], exitTokens[1]], userAddr, userAddr);

const amounts = exit.getOutputAmounts(bptAmountIn, pools);

const amountsWithSlippage = addSlippage(amounts);

const { contract, callData } = exit.callData(bptAmountIn, amountsWithSlippage);

*/

export class Liquidity {
    public constructor(private poolId: HexString, private pools:  BasePool[]) {
    }

    public get poolTokens(): string[] {
        /*
        Would return all tokens that a user can exit/join with:
        - Core pool: poolTokens via Vault. e.g. Weighted BAL/WETH: BAL/WETH
        - BoostedPool: nested tokens via Relayer. e.g. bbausd/wstEth: DAI/USDC/USDT/bbausd/wstEth
        */
        return [];
    }

    private isRelayerExit(exitTokens: HexString[]): boolean {
        // From exitTokens find if exit pool via vault or relayer
        return true;
    }
    
    public getExit(exitTokens: HexString[], sender: HexString, recipient: HexString, toInternalBalance=false): ExitPool {
        /*
        Find actions required to exit to specified tokens.
        - Core pools: Vault, exitPool
        - ComposablePool: Relayer, multicall 
          - e.g. bbausd/wstEth -> [exitPool, exitPool, swap, unwrap]
        */
       const actions: Actions[]  = [];
       if(this.isRelayerExit(exitTokens)) {
            // - note: some pool version do not support proportional exits (e.g. ComposableStable V2(confirm)) which requires a different exit type
            const exitAction: ExitAction = {
                    poolId: this.poolId,
                    sender,
                    recipient,
                    assets: exitTokens,
                    toInternalBalance
                };
            actions.push(exitAction);
       } else {
            /*
            Here we would need to construct the exit path depending on the nested structure and exit tokens
            Will be a combination of exits/swaps/unwraps with chained refs
            - note: some pool version do not support proportional exits (e.g. ComposableStable V2(confirm)) which requires a different exit path using singleToken exits
            - Do we want to support pool versions without proportional exits?
            */
       }
       return new ExitPool(actions);
    }

    // getJoin - similar to getExit constructing actions to join the pool via Vault or Relayer
}