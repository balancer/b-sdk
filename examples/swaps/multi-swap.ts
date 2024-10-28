/**
 * Example showing how to find swap information for a token pair.
 *
 * Run with:
 * pnpm example ./examples/swaps/multi-swap.ts
 */

import {
    balancerBatchRouterAbi,
    vaultV3Abi,
    vaultExtensionAbi_V3,
    permit2Abi,
} from '@/abi';
import { Permit2 } from '@/entities';
import { BALANCER_BATCH_ROUTER, ChainId, CHAINS, MAX_UINT256 } from '@/utils';
import {
    Address,
    createTestClient,
    encodeFunctionData,
    getContract,
    http,
    publicActions,
    walletActions,
    zeroAddress,
} from 'viem';

const multiSwap = async () => {
    const chainId = ChainId.SEPOLIA;
    const rpcUrl = 'AN_RPC_URL';
    // This example requires the account to sign relayer approval
    const client = createTestClient({
        mode: 'anvil',
        chain: CHAINS[chainId],
        transport: http(rpcUrl),
    })
        .extend(publicActions)
        .extend(walletActions);

    const batchRouterContract = getContract({
        address: BALANCER_BATCH_ROUTER[chainId],
        abi: [
            ...balancerBatchRouterAbi,
            ...vaultV3Abi,
            ...vaultExtensionAbi_V3,
            ...permit2Abi,
        ],
        client,
    });

    const usdc = '0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8' as Address;
    const usdcAmountIn = 10n;
    const stataUsdc = '0x8a88124522dbbf1e56352ba3de1d9f78c143751e' as Address;
    const dai = '0xff34b3d4aee8ddcd6f9afffb6fe49bd371b8a357' as Address;
    const daiAmountIn = 10n;
    const stataDai = '0xde46e43f46ff74a23a65ebb0580cbe3dfe684a17' as Address;

    const paths = [
        // USDC > stataUSDC, will use buffer if available and auto wrap if not
        {
            tokenIn: usdc,
            steps: [
                {
                    pool: stataUsdc, // Note same address as tokenOut, e.g. stataUSDC
                    tokenOut: stataUsdc,
                    isBuffer: true,
                },
            ],
            exactAmountIn: usdcAmountIn,
        },
        // DAI > stataDAI, will use buffer if available and auto wrap if not
        {
            tokenIn: dai,
            steps: [
                {
                    pool: stataDai, // Note same address as tokenOut, e.g. stataDAI
                    tokenOut: stataDai,
                    isBuffer: true,
                },
            ],
            exactAmountIn: daiAmountIn,
        },
    ];
    const deadline = MAX_UINT256;
    const wethIsEth = false;
    const userData = '0x';

    // Query
    // result = (uint256[] memory pathAmountsOut, address[] memory tokensOut, uint256[] memory amountsOut)
    // https://github.com/balancer/balancer-v3-monorepo/blob/7a3f4ee081a49d92922cb694bbe0a669627f0919/pkg/interfaces/contracts/vault/IBatchRouter.sol#L76
    const { result } = await batchRouterContract.simulate.querySwapExactIn([
        [
            { ...paths[0], minAmountOut: 0n }, // I can't remember but it may need a value > 0n, if you get issues try 1n
            { ...paths[1], minAmountOut: 0n },
        ],
        zeroAddress,
        userData,
    ]);

    // Result would give you the expected amounts to which slippage can be applied
    const stataUsdcMinAmountOut = 9n; // This should be expected value - slippage
    const stataDaiMinAmountOut = 9n; // This should be expected value - slippage

    const encodedSwapData = encodeFunctionData({
        abi: balancerBatchRouterAbi,
        functionName: 'swapExactIn',
        args: [
            [
                { ...paths[0], minAmountOut: stataUsdcMinAmountOut },
                { ...paths[1], minAmountOut: stataDaiMinAmountOut },
            ],
            deadline,
            wethIsEth,
            userData,
        ],
    });

    // Collect user signatures for USDC & DAI
    const permit2 = {} as Permit2;

    const args = [
        [], // TODO I'm not sure of format for submitting multiple Permit2 signatures but should be easy enough to figure out
        [],
        permit2.batch,
        permit2.signature,
        [encodedSwapData],
    ] as const;

    const callData = encodeFunctionData({
        abi: balancerBatchRouterAbi,
        functionName: 'permitBatchAndCall',
        args,
    });

    // callData would be submitted to batchRouter

    /*
    I think eventually you could even do something like below to do it all in a single tx with a bunch of signature...maybe :)

    const encodedSwapData = same as above
    const encodedInitData = encodeFunctionData(...whatever the init function would be)

    const args = [
        [],
        [],
        permit2.batch, // permit2 sigs for usdc, dai, stataDai, stataUsdc
        permit2.signature,
        [encodedSwapData, encodedInitData],
    ] as const;

    const callData = encodeFunctionData({
        abi: balancerBatchRouterAbi,
        functionName: 'permitBatchAndCall',
        args,
    });
    */
};

export default multiSwap;
