// pnpm test -- v3/createPool/gyroECLP/gyroECLP.integration.test.ts
import {
    Address,
    createTestClient,
    http,
    publicActions,
    walletActions,
    zeroAddress,
    parseUnits,
    TestActions,
} from 'viem';
import {
    CHAINS,
    ChainId,
    PoolType,
    TokenType,
    CreatePoolGyroECLPInput,
    InitPool,
    Permit2Helper,
    PERMIT2,
    VAULT_V3,
    vaultExtensionAbi_V3,
    PublicWalletClient,
    InitPoolDataProvider,
    calcDerivedParams,
} from 'src';
import { ANVIL_NETWORKS, startFork } from '../../../anvil/anvil-global-setup';
import {
    doCreatePool,
    TOKENS,
    assertInitPool,
    setTokenBalances,
    approveSpenderOnTokens,
    sendTransactionGetBalances,
} from '../../../lib/utils';

const protocolVersion = 3;
const chainId = ChainId.SEPOLIA;
const poolType = PoolType.GyroE;
const BAL = TOKENS[chainId].BAL;
const DAI = TOKENS[chainId].DAI;

describe('GyroECLP - create & init', () => {
    let rpcUrl: string;
    let client: PublicWalletClient & TestActions;
    let testAddress: Address;
    let createPoolInput: CreatePoolGyroECLPInput;
    let poolAddress: Address;

    beforeAll(async () => {
        ({ rpcUrl } = await startFork(
            ANVIL_NETWORKS.SEPOLIA,
            undefined,
            7747598n,
        ));
        client = createTestClient({
            mode: 'anvil',
            chain: CHAINS[chainId],
            transport: http(rpcUrl, { timeout: 120_000 }),
        })
            .extend(publicActions)
            .extend(walletActions);
        testAddress = (await client.getAddresses())[0];

        await setTokenBalances(
            client,
            testAddress,
            [DAI.address, BAL.address],
            [DAI.slot!, BAL.slot!],
            [parseUnits('100', 18), parseUnits('100', 18)],
        );

        await approveSpenderOnTokens(
            client,
            testAddress,
            [DAI.address, BAL.address],
            PERMIT2[chainId],
        );

        createPoolInput = {
            poolType,
            symbol: '50BAL-50DAI',
            tokens: [
                {
                    address: BAL.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
                {
                    address: DAI.address,
                    rateProvider: zeroAddress,
                    tokenType: TokenType.STANDARD,
                    paysYieldFees: false,
                },
            ],
            swapFeePercentage: 10000000000000000n,
            poolHooksContract: zeroAddress,
            pauseManager: testAddress,
            swapFeeManager: testAddress,
            disableUnbalancedLiquidity: false,
            chainId,
            protocolVersion,
            enableDonation: false,
            eclpParams: {
                alpha: 998502246630054917n,
                beta: 1000200040008001600n,
                c: 707106781186547524n,
                s: 707106781186547524n,
                lambda: 4000000000000000000000n,
            },
            derivedEclpParams: {
                tauAlpha: {
                    x: -94861212813096057289512505574275160547n,
                    y: 31644119574235279926451292677567331630n,
                },
                tauBeta: {
                    x: 37142269533113549537591131345643981951n,
                    y: 92846388265400743995957747409218517601n,
                },
                u: 66001741173104803338721745994955553010n,
                v: 62245253919818011890633399060291020887n,
                w: 30601134345582732000058913853921008022n,
                z: -28859471639991253843240999485797747790n,
                dSq: 99999999999999999886624093342106115200n,
            },
        };

        poolAddress = await doCreatePool({
            client,
            testAddress,
            createPoolInput,
        });
    }, 120_000);

    test('calc derived params #1', async () => {
        const derivedEclpParams = calcDerivedParams(createPoolInput.eclpParams);

        expect(derivedEclpParams).to.deep.equal(
            createPoolInput.derivedEclpParams,
        );
    });

    test('calc derived params #2', async () => {
        // https://beets.fi/pools/sonic/v2/0x83952912178aa33c3853ee5d942c96254b235dcc0002000000000000000000ab
        const derivedEclpParams = calcDerivedParams({
            alpha: 998000000000000000n,
            beta: 1000500000000000000n,
            c: 707106781186547524n,
            s: 707106781186547524n,
            lambda: 1500000000000000000000n,
        });

        expect(derivedEclpParams).to.deep.equal({
            tauAlpha: {
                x: -83230629990868117604012997897930104612n,
                y: 55431599573918166324272656600021449671n,
            },
            tauBeta: {
                x: 35104649870455996992435049398685666214n,
                y: 93635802754462962644488421762760900350n,
            },
            u: 59167639930662057231142175428841721269n,
            v: 74533701164190564399877279720804912886n,
            w: 19102101590272398138450701712686427826n,
            z: -24062990060206060278507341099864712753n,
            dSq: 99999999999999999886624093342106115200n,
        });
    });

    test('calc derived params #3', async () => {
        // https://beets.fi/pools/sonic/v2/0xe7734b495a552ab6f4c78406e672cca7175181e10002000000000000000000c5
        const derivedEclpParams = calcDerivedParams({
            alpha: 424242420000000000n,
            beta: 909090900000000000n,
            c: 791285002436294737n,
            s: 611447499724541381n,
            lambda: 1000000000000000000n,
        });

        expect(derivedEclpParams).to.deep.equal({
            tauAlpha: {
                x: -25385119577606970601054756051800520644n,
                y: 96724328397929935169889968923487603202n,
            },
            tauBeta: {
                x: 7984138065077215533782444860237401279n,
                y: 99680758119898872774769810063939314838n,
            },
            u: 16145022441464826971736243356000128462n,
            v: 97829642998024046593675011328890269233n,
            w: 1430407134582051721445197790463086591n,
            z: -4491561050204635011840077147130502263n,
            dSq: 100000000000000000006349449631528633000n,
        });
    });

    test('creation', async () => {
        expect(poolAddress).to.not.be.undefined;
    });

    test('registration', async () => {
        const isPoolRegistered = await client.readContract({
            address: VAULT_V3[chainId],
            abi: vaultExtensionAbi_V3,
            functionName: 'isPoolRegistered',
            args: [poolAddress],
        });
        expect(isPoolRegistered).to.be.true;
    });

    test('initialization', async () => {
        const initPoolInput = {
            amountsIn: [
                {
                    address: BAL.address,
                    rawAmount: parseUnits('10', BAL.decimals),
                    decimals: BAL.decimals,
                },
                {
                    address: DAI.address,
                    rawAmount: parseUnits('17', DAI.decimals),
                    decimals: DAI.decimals,
                },
            ],
            minBptAmountOut: 0n,
            chainId,
        };

        const initPoolDataProvider = new InitPoolDataProvider(chainId, rpcUrl);
        const poolState = await initPoolDataProvider.getInitPoolData(
            poolAddress,
            poolType,
            protocolVersion,
        );

        const permit2 = await Permit2Helper.signInitPoolApproval({
            ...initPoolInput,
            client,
            owner: testAddress,
        });

        const initPool = new InitPool();
        const initPoolBuildOutput = initPool.buildCallWithPermit2(
            initPoolInput,
            poolState,
            permit2,
        );

        const txOutput = await sendTransactionGetBalances(
            [BAL.address, DAI.address],
            client,
            testAddress,
            initPoolBuildOutput.to,
            initPoolBuildOutput.callData,
            initPoolBuildOutput.value,
        );

        assertInitPool(initPoolInput, { txOutput, initPoolBuildOutput });
    }, 120_000);
});
