import { Address, Hex, PoolType } from '@/types';
import { ChainId } from '@/utils';

export type TestToken = { address: Address; decimals: number; slot?: number };

export const TOKENS: Record<number, Record<string, TestToken>> = {
    [ChainId.MAINNET]: {
        WETH: {
            address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            decimals: 18,
            slot: 3,
        },
        DAI: {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f',
            decimals: 18,
            slot: 2,
        },
        USDC: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            decimals: 6,
            slot: 9,
        },
        USDT: {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            decimals: 6,
            slot: 2,
        },
        vETH: {
            address: '0x4bc3263eb5bb2ef7ad9ab6fb68be80e43b43801f',
            decimals: 18,
        },
        bb_s_DAI: {
            address: '0x2b218683178d029bab6c9789b1073aa6c96e5176',
            decimals: 18,
        },
        bb_a_USDC: {
            address: '0x82698aecc9e28e9bb27608bd52cf57f704bd1b83',
            decimals: 18,
        },
        BAL: {
            address: '0xba100000625a3754423978a60c9317c58a424e3D',
            decimals: 18,
            slot: 1,
        },
        wstETH: {
            address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
            decimals: 18,
            slot: 0,
        },
        sfrxETH: {
            address: '0xac3e018457b222d93114458476f3e3416abbe38f',
            decimals: 18,
        },
        rETH: {
            address: '0xae78736cd615f374d3085123a210448e74fc6393',
            decimals: 18,
        },
    },
    [ChainId.OPTIMISM]: {
        FRAX: {
            address: '0x2e3d870790dc77a83dd1d18184acc7439a53f475',
            decimals: 18,
        },
        MAI: {
            address: '0xdfa46478f9e5ea86d57387849598dbfb2e964b02',
            decimals: 18,
        },
        USDC: {
            address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
            decimals: 6,
        },
    },
    [ChainId.POLYGON]: {
        DAI: {
            address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
            decimals: 18,
        },
        USDC: {
            address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            decimals: 6,
        },
        WMATIC: {
            address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
            decimals: 18,
            slot: 3,
        },
    },
    [ChainId.SEPOLIA]: {
        BAL: {
            address: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
            decimals: 18,
            slot: 1,
        },
        WETH: {
            address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
            decimals: 18,
            slot: 3,
        },
        DAI: {
            address: '0xb77eb1a70a96fdaaeb31db1b42f2b8b5846b2613',
            decimals: 18,
            slot: 0,
        },
        USDC: {
            address: '0x80d6d3946ed8a1da4e226aa21ccddc32bd127d1a',
            decimals: 6,
            slot: 0,
        },
        scUSD: {
            address: '0x990c8eab51d9ecb365bf9b3de09d121af007db68',
            decimals: 18,
            slot: 0,
        },
        scDAI: {
            address: '0xcd20075dc190c411287132e891ec42f009babc73',
            decimals: 18,
            slot: 0,
        },
        USDC_AAVE: {
            address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
            decimals: 6,
            slot: 0,
        },
        DAI_AAVE: {
            address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
            decimals: 18,
            slot: 0,
        },
        stataUSDC: {
            address: '0x8a88124522dbbf1e56352ba3de1d9f78c143751e',
            decimals: 6,
            slot: 0,
        },
        stataDAI: {
            address: '0xde46e43f46ff74a23a65ebb0580cbe3dfe684a17',
            decimals: 18,
            slot: 0,
        },
    },
    [ChainId.MODE]: {
        MODE: {
            address: '0xDfc7C877a950e49D2610114102175A06C2e3167a',
            decimals: 18,
            slot: 0,
        },
        EZETH: {
            address: '0x2416092f143378750bb29b79eD961ab195CcEea5',
            decimals: 18,
            slot: 51,
        },
    },
    [ChainId.FRAXTAL]: {
        sFRAX: {
            address: '0xfc00000000000000000000000000000000000008',
            decimals: 18,
            slot: 0,
        },
    },
    [ChainId.AVALANCHE]: {
        sAVAX: {
            address: '0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be',
            decimals: 18,
            slot: 0,
        },
        WAAVAX: {
            address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
            decimals: 18,
            slot: 0,
        },
    },
    [ChainId.GNOSIS_CHAIN]: {
        WETH: {
            address: '0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1',
            decimals: 18,
            slot: 3,
        },
        wstETH: {
            address: '0x6c76971f98945ae98dd7d4dfca8711ebea946ea6',
            decimals: 18,
        },
        GNO: {
            address: '0x9c58bacc331c9aa871afd802db6379a98e80cedb',
            decimals: 18,
            slot: 3,
        },
    },
};

export type TestPool = TestToken & { id: Hex; type: PoolType };

export const POOLS: Record<number, Record<string, TestPool>> = {
    [ChainId.MAINNET]: {
        BPT_3POOL: {
            address: '0x79c58f70905f734641735bc61e45c19dd9ad60bc',
            id: '0x79c58f70905f734641735bc61e45c19dd9ad60bc0000000000000000000004e7',
            type: PoolType.ComposableStable,
            decimals: 18,
            slot: 0,
        },
        BPT_WETH_3POOL: {
            address: '0x08775ccb6674d6bdceb0797c364c2653ed84f384',
            id: '0x08775ccb6674d6bdceb0797c364c2653ed84f3840002000000000000000004f0',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
        vETH_WETH: {
            id: '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76000000000000000000000570',
            address: '0x156c02f3f7fef64a3a9d80ccf7085f23cce91d76',
            type: PoolType.ComposableStable,
            decimals: 18,
            slot: 0,
        },
        wstETH_rETH_sfrxETH: {
            id: '0x42ed016f826165c2e5976fe5bc3df540c5ad0af700000000000000000000058b',
            address: '0x42ed016f826165c2e5976fe5bc3df540c5ad0af7',
            type: PoolType.ComposableStable,
            decimals: 18,
            slot: 0,
        },
        BAL_WETH: {
            id: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014',
            address: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f56',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
        wstETH_wETH_CSP: {
            id: '0x93d199263632a4ef4bb438f1feb99e57b4b5f0bd0000000000000000000005c2',
            address: '0x93d199263632a4ef4bb438f1feb99e57b4b5f0bd',
            type: PoolType.ComposableStable,
            decimals: 18,
            slot: 0,
        },
        wstETH_wETH_MSP: {
            id: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
            address: '0x32296969ef14eb0c6d29669c550d4a0449130230',
            type: PoolType.MetaStable,
            decimals: 18,
            slot: 0,
        },
    },
    [ChainId.OPTIMISM]: {
        FRAX_USDC_MAI: {
            id: '0x3dc09db8e571da76dd04e9176afc7feee0b89106000000000000000000000019',
            address: '0x3dc09db8e571da76dd04e9176afc7feee0b89106',
            type: PoolType.Stable,
            decimals: 18,
            slot: 0,
        },
    },
    [ChainId.POLYGON]: {
        DAO_st_WMATIC: {
            id: '0x60f46b189736c0d2ae52a79382b64c1e2a86b0d9000200000000000000000cc4',
            address: '0x60f46b189736c0d2ae52a79382b64c1e2a86b0d9',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
        DAI_WMATIC: {
            id: '0x9d75cc71555ddabcb89b52c818c2c689e2191401000200000000000000000762',
            address: '0x9d75cc71555ddabcb89b52c818c2c689e2191401',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
    },
    [ChainId.SEPOLIA]: {
        MOCK_WETH_BAL_POOL: {
            address: '0xec1b5ca86c83c7a85392063399e7d2170d502e00',
            id: '0xec1b5ca86c83c7a85392063399e7d2170d502e00',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
        MOCK_BAL_DAI_POOL: {
            address: '0x3e8b62395aea51c3d7bdfeb8cde7d4a272c34750',
            id: '0x3e8b62395aea51c3d7bdfeb8cde7d4a272c34750',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
        MOCK_USDC_DAI_POOL: {
            address: '0x0d27823a7768c2fefe22dac9f9c99dce5f71d137',
            id: '0x0d27823a7768c2fefe22dac9f9c99dce5f71d137',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
        MOCK_NESTED_POOL: {
            address: '0x6e7c4fb3dbb54d404cd52ba2078d6bf8cea9f294',
            id: '0x6e7c4fb3dbb54d404cd52ba2078d6bf8cea9f294',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
        MOCK_COW_AMM_POOL: {
            address: '0x8cc781653bda4643c84dec5d7ad3e19ea354a54a',
            id: '0x8cc781653bda4643c84dec5d7ad3e19ea354a54a',
            type: PoolType.CowAmm,
            decimals: 18,
            slot: 0,
        },
        MOCK_BOOSTED_POOL: {
            address: '0x9a80f41e59af098ac33650d67496f865bb91a2ce',
            id: '0x9a80f41e59af098ac33650d67496f865bb91a2ce',
            type: PoolType.Stable,
            decimals: 18,
            slot: 0,
        },
    },
};
