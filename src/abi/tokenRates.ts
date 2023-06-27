export const tokenRatesFragmentAbi = [
    {
        inputs: [],
        name: 'getTokenRates',
        outputs: [
            {
                internalType: 'uint256',
                name: 'rate0',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'rate1',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;
