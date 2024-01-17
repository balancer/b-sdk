import { parseEther, parseUnits } from 'viem';
import { AddLiquidityKind, ChainId, PoolType } from '../src';
import { InitPoolDataProvider } from '../src/data/providers/initPoolDataProvider';
import { InitPool } from '../src/entities/initPool';
import { InitPoolInput } from '../src/entities/initPool/types';
import {
    forkSetup,
    sendTransactionGetBalances,
} from '../test/lib/utils/helper';
import createPoolComposableStable from './createPoolComposableStable';

const initPool = async () => {
    const { rpcUrl, client, poolAddress } = await createPoolComposableStable();
    const chainId = ChainId.MAINNET;
    const initPool = new InitPool();
    const poolType = PoolType.ComposableStable;
    const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
    const signerAddress = (await client.getAddresses())[0];

    const initPoolInput: InitPoolInput = {
        kind: AddLiquidityKind.Init,
        sender: signerAddress,
        recipient: signerAddress,
        amountsIn: [
            {
                address: '0xba100000625a3754423978a60c9317c58a424e3d',
                rawAmount: parseEther('100'),
                decimals: 18,
            },
            {
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                rawAmount: parseEther('100'),
                decimals: 18,
            },
        ],
        chainId,
    };
    const poolState = await initPoolDataProvider.getInitPoolData(
        poolAddress,
        poolType,
        2,
    );

    // Making the setup so the user wallet have enough balance to do the transaction
    await forkSetup(
        client,
        signerAddress,
        poolState.tokens.map((t) => t.address),
        [0, 1, 3],
        poolState.tokens.map((t) => parseUnits('100000', t.decimals)),
    );

    const { call, to, value } = await initPool.buildCall(
        initPoolInput,
        poolState,
    );
    const txOutput = await sendTransactionGetBalances(
        poolState.tokens.map((t) => t.address),
        client,
        signerAddress,
        to,
        call,
        value,
    );

    console.log(`Transaction Status: ${txOutput.transactionReceipt.status}`);
    console.log(`BPT Balance Delta: ${txOutput.balanceDeltas[0]}`);
    for (let i = 0; i < initPoolInput.amountsIn.length; i++) {
        console.log(
            `Token ${i} Balance Delta: -${txOutput.balanceDeltas[i + 1]}`,
        );
    }
};

export default initPool;
