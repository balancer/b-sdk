import { CreateAnvilOptions, createAnvil } from '@viem/anvil';
import { sleep } from '../lib/utils/promises';

type NetworkSetup = {
    rpcEnv: string;
    fallBackRpc: string | undefined;
    port: number;
    forkBlockNumber: bigint;
};

type Networks = NetworkSetup[];

const NETWORKS: Networks = [
    {
        rpcEnv: 'ETHEREUM_RPC_URL',
        fallBackRpc: 'https://cloudflare-eth.com',
        port: 8545,
        forkBlockNumber: 18043296n,
    },
    {
        rpcEnv: 'POLYGON_RPC_URL',
        // Public Polygon RPCs are usually unreliable
        fallBackRpc: undefined,
        port: 8137,
        forkBlockNumber: 43878700n,
    },
];

export default async function () {
    for (const network of NETWORKS) {
        const config = getAnvilOptions(network);
        await startFork(config);
    }
}

function getAnvilOptions(network: NetworkSetup): CreateAnvilOptions {
    let forkUrl: string;
    if (process.env[network.rpcEnv]) {
        forkUrl = process.env[network.rpcEnv] as string;
    } else {
        if (!network.fallBackRpc)
            throw Error(
                `Please add a environment variable for: ${network.rpcEnv}`,
            );
        forkUrl = network.fallBackRpc;
        console.warn(
            `\`${network.rpcEnv}\` not found. Falling back to \`${forkUrl}\`.`,
        );
    }
    const port = network.port;
    const forkBlockNumber = network.forkBlockNumber;
    return {
        forkUrl,
        port,
        forkBlockNumber,
    };
}

async function startFork(anvilOptions: CreateAnvilOptions) {
    // https://www.npmjs.com/package/@viem/anvil
    const anvil = createAnvil(anvilOptions);
    if (process.env.SKIP_GLOBAL_SETUP === 'true') {
        console.warn(`🛠️  Skipping global anvil setup. You must run the anvil fork manually. Example:
anvil --fork-url https://eth-mainnet.alchemyapi.io/v2/<your-key> --port 8555 --fork-block-number=17878719
`);
        await sleep(5000);
        return;
    }
    console.log('🛠️  Starting anvil', {
        port: anvilOptions.port,
        forkBlockNumber: anvilOptions.forkBlockNumber,
    });
    return await anvil.start();
}
