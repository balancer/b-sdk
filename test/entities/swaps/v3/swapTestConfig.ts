import { ChainId, Path, Slippage } from '@/index';
import { ANVIL_NETWORKS, NetworkSetup } from 'test/anvil/anvil-global-setup';
import { POOLS, TOKENS } from 'test/lib/utils/addresses';

// Test configuration constants
export const TEST_CONSTANTS = {
    ANVIL_TEST_ADDRESS: '0x831eFb058FEdCd16Cd6b9174206DFe452dDCe8C3', // address from mnemonic "you twelve word test phrase boat cat like this example dog car"
    BALANCE_MULTIPLIER: 10n, // For setting token balances
    slippage: Slippage.fromPercentage('0.1'),
    deadline: 999999999999999999n,
    SWAP_TEST_DATA_FILENAME: 'swapTestData.json',
    defaultOutputTest: {
        testExactOutAmount: true,
        percentage: 0,
    },
} as const;

export type NativePosition = 'input' | 'output' | 'none';

export type Test = {
    name: string;
    chainId: ChainId;
    anvilNetwork: NetworkSetup;
    path: Path;
    isNative: NativePosition;
    blockNumber?: bigint;
    outputTest?: {
        testExactOutAmount: boolean;
        percentage: number;
    };
};

export const tests: Test[] = [
    {
        name: 'Single Swap: WETH[swap]USDC',
        chainId: ChainId.BASE,
        anvilNetwork: ANVIL_NETWORKS.BASE,
        path: {
            protocolVersion: 3,
            tokens: [
                {
                    address: TOKENS[ChainId.BASE].WETH.address,
                    decimals: TOKENS[ChainId.BASE].WETH.decimals,
                },
                {
                    address: TOKENS[ChainId.BASE].USDC.address,
                    decimals: TOKENS[ChainId.BASE].USDC.decimals,
                },
            ],
            pools: ['0x7b4c560f33a71a9f7a500af3c4c65b46fbbafdb7'], // https://balancer.fi/pools/base/v3/0x7b4c560f33a71a9f7a500af3c4c65b46fbbafdb7
            inputAmountRaw: 10000000000000000n,
            outputAmountRaw: 100000000n,
        },
        isNative: 'input',
    },
    {
        name: 'Single Swap: USDC[swap]WETH',
        chainId: ChainId.BASE,
        anvilNetwork: ANVIL_NETWORKS.BASE,
        path: {
            protocolVersion: 3,
            tokens: [
                {
                    address: TOKENS[ChainId.BASE].USDC.address,
                    decimals: TOKENS[ChainId.BASE].USDC.decimals,
                },
                {
                    address: TOKENS[ChainId.BASE].WETH.address,
                    decimals: TOKENS[ChainId.BASE].WETH.decimals,
                },
            ],
            pools: ['0x7b4c560f33a71a9f7a500af3c4c65b46fbbafdb7'],
            inputAmountRaw: 1000000000n,
            outputAmountRaw: 100000000000000000n,
        },
        isNative: 'output',
    },
    {
        name: 'Multihop Swap: WETH[swap]USDC[swap]EURC',
        chainId: ChainId.BASE,
        anvilNetwork: ANVIL_NETWORKS.BASE,
        path: {
            protocolVersion: 3,
            tokens: [
                {
                    address: TOKENS[ChainId.BASE].WETH.address,
                    decimals: TOKENS[ChainId.BASE].WETH.decimals,
                },
                {
                    address: TOKENS[ChainId.BASE].USDC.address,
                    decimals: TOKENS[ChainId.BASE].USDC.decimals,
                },
                {
                    address: TOKENS[ChainId.BASE].EURC.address,
                    decimals: TOKENS[ChainId.BASE].EURC.decimals,
                },
            ],
            pools: [
                '0x7b4c560f33a71a9f7a500af3c4c65b46fbbafdb7',
                '0x608382d1627c1f2f939c87d14fdb62d5bcbf561f',
            ],
            inputAmountRaw: 10000000000000000n,
            outputAmountRaw: 100000000n,
        },
        isNative: 'input',
    },
    {
        name: 'Multihop Swap: EURC[swap]USDC[swap]WETH',
        chainId: ChainId.BASE,
        anvilNetwork: ANVIL_NETWORKS.BASE,
        path: {
            protocolVersion: 3,
            tokens: [
                {
                    address: TOKENS[ChainId.BASE].EURC.address,
                    decimals: TOKENS[ChainId.BASE].EURC.decimals,
                },
                {
                    address: TOKENS[ChainId.BASE].USDC.address,
                    decimals: TOKENS[ChainId.BASE].USDC.decimals,
                },
                {
                    address: TOKENS[ChainId.BASE].WETH.address,
                    decimals: TOKENS[ChainId.BASE].WETH.decimals,
                },
            ],
            pools: [
                '0x608382d1627c1f2f939c87d14fdb62d5bcbf561f',
                '0x7b4c560f33a71a9f7a500af3c4c65b46fbbafdb7',
            ],
            inputAmountRaw: 100000000n,
            outputAmountRaw: 10000000000000000n,
        },
        isNative: 'output',
    },
    {
        name: 'Multihop Swap With Exit: WETH[swap]BPT[Exit]USDC',
        chainId: ChainId.SEPOLIA,
        anvilNetwork: ANVIL_NETWORKS.SEPOLIA,
        path: {
            protocolVersion: 3,
            tokens: [
                {
                    address: TOKENS[ChainId.SEPOLIA].WETH.address,
                    decimals: TOKENS[ChainId.SEPOLIA].WETH.decimals,
                },
                {
                    address: POOLS[ChainId.SEPOLIA].MOCK_USDC_DAI_POOL.address,
                    decimals:
                        POOLS[ChainId.SEPOLIA].MOCK_USDC_DAI_POOL.decimals,
                },
                {
                    address: TOKENS[ChainId.SEPOLIA].USDC_AAVE.address,
                    decimals: TOKENS[ChainId.SEPOLIA].USDC_AAVE.decimals,
                },
            ],
            pools: [
                POOLS[ChainId.SEPOLIA].MOCK_NESTED_POOL.id,
                POOLS[ChainId.SEPOLIA].MOCK_USDC_DAI_POOL.id,
            ],
            inputAmountRaw: 100000000000000n,
            outputAmountRaw: 600000n,
        },
        isNative: 'input',
    },
    {
        name: 'Multihop Swap With Join: USDC[join]BPT[swap]WETH',
        chainId: ChainId.SEPOLIA,
        anvilNetwork: ANVIL_NETWORKS.SEPOLIA,
        path: {
            protocolVersion: 3,
            tokens: [
                {
                    address: TOKENS[ChainId.SEPOLIA].USDC_AAVE.address,
                    decimals: TOKENS[ChainId.SEPOLIA].USDC_AAVE.decimals,
                },
                {
                    address: POOLS[ChainId.SEPOLIA].MOCK_USDC_DAI_POOL.address,
                    decimals:
                        POOLS[ChainId.SEPOLIA].MOCK_USDC_DAI_POOL.decimals,
                },
                {
                    address: TOKENS[ChainId.SEPOLIA].WETH.address,
                    decimals: TOKENS[ChainId.SEPOLIA].WETH.decimals,
                },
            ],
            pools: [
                POOLS[ChainId.SEPOLIA].MOCK_USDC_DAI_POOL.id,
                POOLS[ChainId.SEPOLIA].MOCK_NESTED_POOL.id,
            ],
            inputAmountRaw: 600000n,
            outputAmountRaw: 100000000000000n,
        },
        isNative: 'output',
    },
    {
        name: 'Swap With Buffers: USDC[wrap]waEthUSDC[swap]waEthLidoGHO[unwrap]GHO',
        chainId: ChainId.MAINNET,
        anvilNetwork: ANVIL_NETWORKS.MAINNET,
        path: {
            protocolVersion: 3,
            tokens: [
                {
                    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
                    decimals: 6,
                },
                {
                    address: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e', // waEthUSDC
                    decimals: 6,
                },
                {
                    address: '0xc71ea051a5f82c67adcf634c36ffe6334793d24c', // waEthLidoGHO
                    decimals: 18,
                },
                {
                    address: '0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f', // GHO
                    decimals: 18,
                },
            ],
            pools: [
                '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e', // waEthUSDC (ERC4626)
                '0x85b2b559bc2d21104c4defdd6efca8a20343361d', // Pool
                '0xc71ea051a5f82c67adcf634c36ffe6334793d24c', // waEthLidoGHO (ERC4626),
            ],
            isBuffer: [true, false, true],
            inputAmountRaw: 10000000000n,
            outputAmountRaw: 100000000000000000000n,
        },
        isNative: 'none',
        blockNumber: 24017736n,
        outputTest: {
            testExactOutAmount: false,
            percentage: 0.001,
        },
    },
];
