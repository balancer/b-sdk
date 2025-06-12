// pnpm test v3/createPool/gyroECLP/gyroECLP.helpers.test.ts
import {
    computeDerivedEclpParams,
    normalizeEclpParamsAndTokens,
    TokenType,
    TokenConfig,
} from 'src';
import { parseUnits, zeroAddress } from 'viem';
import { areBigIntsWithinPercent } from '../../../lib/utils/swapHelpers';

describe('Unit tests for GyroECLP helpers', () => {
    describe('computeDerivedEclpParams', () => {
        test('case 1', async () => {
            // https://github.com/balancer/balancer-v3-foundry-starter/blob/main/script/GyroECLPCreate.s.sol
            const derivedParams = computeDerivedEclpParams({
                alpha: 998502246630054917n,
                beta: 1000200040008001600n,
                c: 707106781186547524n,
                s: 707106781186547524n,
                lambda: 4000000000000000000000n,
            });

            expect(derivedParams).to.deep.equal({
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
            });
        });

        test('case 2', async () => {
            // https://beets.fi/pools/sonic/v2/0x83952912178aa33c3853ee5d942c96254b235dcc0002000000000000000000ab
            const derivedParams = computeDerivedEclpParams({
                alpha: 998000000000000000n,
                beta: 1000500000000000000n,
                c: 707106781186547524n,
                s: 707106781186547524n,
                lambda: 1500000000000000000000n,
            });

            expect(derivedParams).to.deep.equal({
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

        test('case 3', async () => {
            // https://beets.fi/pools/sonic/v2/0xe7734b495a552ab6f4c78406e672cca7175181e10002000000000000000000c5
            const derivedParams = computeDerivedEclpParams({
                alpha: 424242420000000000n,
                beta: 909090900000000000n,
                c: 791285002436294737n,
                s: 611447499724541381n,
                lambda: 1000000000000000000n,
            });

            expect(derivedParams).to.deep.equal({
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
    });
    describe('normalizeEclpParamsAndTokens', () => {
        const standardTokenConfig = {
            rateProvider: zeroAddress,
            tokenType: TokenType.STANDARD,
            paysYieldFees: false,
        };

        const eclpParamsKeys = ['alpha', 'beta', 'c', 's', 'lambda'] as const;
        const tolerancePercent = 0.00000001; // 0.00000001% tolerance (minimum possible value given magic numbers of areBigIntsWithinPercent: 1e8 for percentFactor and 1e10 for tolerance)

        test('Correlated assets: USDC / DAI', async () => {
            const tokensInOrder: TokenConfig[] = [
                {
                    address: '0x80d6d3946ed8a1da4e226aa21ccddc32bd127d1a', // USDC
                    ...standardTokenConfig,
                },
                {
                    address: '0xb77eb1a70a96fdaaeb31db1b42f2b8b5846b2613', // DAI
                    ...standardTokenConfig,
                },
            ];
            const normalizedEclpParams = {
                alpha: parseUnits('0.900058521243211174', 18),
                beta: parseUnits('1.100071525963924657', 18),
                c: parseUnits('0.707083792244761648', 18),
                s: parseUnits('0.707129769380957930', 18),
                lambda: parseUnits('1000', 18),
            };

            const tokensReversedOrder = [...tokensInOrder].reverse();

            const { eclpParams: invertedEclpParams } =
                normalizeEclpParamsAndTokens({
                    tokens: tokensReversedOrder,
                    eclpParams: normalizedEclpParams,
                });

            const paramsWithoutInversion = normalizeEclpParamsAndTokens({
                tokens: tokensInOrder,
                eclpParams: normalizedEclpParams,
            });

            const paramsWithInversion = normalizeEclpParamsAndTokens({
                tokens: tokensReversedOrder,
                eclpParams: invertedEclpParams,
            });

            // Compare each parameter with a small tolerance
            for (const param of eclpParamsKeys) {
                expect(
                    areBigIntsWithinPercent(
                        paramsWithoutInversion.eclpParams[param],
                        paramsWithInversion.eclpParams[param],
                        tolerancePercent,
                    ),
                ).to.be.true;
            }

            expect(paramsWithoutInversion.tokens).to.deep.equal(
                paramsWithInversion.tokens,
            );
        });

        test('Semicorrelated assets: WBTC / WETH', async () => {
            const tokensInOrder: TokenConfig[] = [
                {
                    address: '0x29f2d40b0605204364af54ec677bd022da425d03', // WBTC
                    ...standardTokenConfig,
                },
                {
                    address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9', // WETH
                    ...standardTokenConfig,
                },
            ];
            const normalizedEclpParams = {
                alpha: parseUnits('37.830258074007538482', 18),
                beta: parseUnits('46.236982090453658145', 18),
                c: parseUnits('0.023783750356145063', 18),
                s: parseUnits('0.999717126600818302', 18),
                lambda: parseUnits('1000', 18),
            };

            const tokensReversedOrder = [...tokensInOrder].reverse();

            const { eclpParams: invertedEclpParams } =
                normalizeEclpParamsAndTokens({
                    tokens: tokensReversedOrder,
                    eclpParams: normalizedEclpParams,
                });

            const paramsWithoutInversion = normalizeEclpParamsAndTokens({
                tokens: tokensInOrder,
                eclpParams: normalizedEclpParams,
            });

            const paramsWithInversion = normalizeEclpParamsAndTokens({
                tokens: tokensReversedOrder,
                eclpParams: invertedEclpParams,
            });

            // Compare each parameter with a small tolerance
            for (const param of eclpParamsKeys) {
                expect(
                    areBigIntsWithinPercent(
                        paramsWithoutInversion.eclpParams[param],
                        paramsWithInversion.eclpParams[param],
                        tolerancePercent,
                    ),
                ).to.be.true;
            }

            // Compare tokens array
            expect(paramsWithoutInversion.tokens).to.deep.equal(
                paramsWithInversion.tokens,
            );
        });

        test('Uncorrelated assets: WBTC / DAI', async () => {
            const tokensInOrder: TokenConfig[] = [
                {
                    address: '0x29f2d40b0605204364af54ec677bd022da425d03', // WBTC
                    ...standardTokenConfig,
                },
                {
                    address: '0x80d6d3946ed8a1da4e226aa21ccddc32bd127d1a', // DAI
                    ...standardTokenConfig,
                },
            ];

            const normalizedEclpParams = {
                alpha: parseUnits('98000', 18),
                beta: parseUnits('120000', 18),
                c: parseUnits('0.000009207254171956', 18),
                s: parseUnits('0.999999999957613235', 18),
                lambda: parseUnits('1000000', 18),
            };

            const tokensReversedOrder = [...tokensInOrder].reverse();

            const { eclpParams: invertedEclpParams } =
                normalizeEclpParamsAndTokens({
                    tokens: tokensReversedOrder,
                    eclpParams: normalizedEclpParams,
                });

            const paramsWithoutInversion = normalizeEclpParamsAndTokens({
                tokens: tokensInOrder,
                eclpParams: normalizedEclpParams,
            });

            const paramsWithInversion = normalizeEclpParamsAndTokens({
                tokens: tokensReversedOrder,
                eclpParams: invertedEclpParams,
            });

            for (const param of eclpParamsKeys) {
                expect(
                    areBigIntsWithinPercent(
                        paramsWithoutInversion.eclpParams[param],
                        paramsWithInversion.eclpParams[param],
                        tolerancePercent,
                    ),
                ).to.be.true;
            }

            expect(paramsWithoutInversion.tokens).to.deep.equal(
                paramsWithInversion.tokens,
            );
        });
    });
});
