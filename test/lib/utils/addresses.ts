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
            address: '0x1b84ffc8c5052b0518a85f505ff2aa56d290fbbe',
            id: '0x1b84ffc8c5052b0518a85f505ff2aa56d290fbbe',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
        MOCK_BAL_DAI_POOL: {
            address: '0x9B0C8FB62319B27080C9bfc791C20265dcC60318',
            id: '0x9B0C8FB62319B27080C9bfc791C20265dcC60318',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
        MOCK_USDC_DAI_POOL: {
            address: '0xa7BD4D358F50691BE553df2a133EDa2b801330C2',
            id: '0xa7BD4D358F50691BE553df2a133EDa2b801330C2',
            type: PoolType.Weighted,
            decimals: 18,
            slot: 0,
        },
        MOCK_NESTED_POOL: {
            address: '0xf6c14c484d4669562c704ae09c9e09284c090c54',
            id: '0xf6c14c484d4669562c704ae09c9e09284c090c54',
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
    },
};
