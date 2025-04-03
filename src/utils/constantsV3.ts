import { Address } from 'viem';
import { ChainId } from './constants';

// V3
export const VAULT_V3: Record<number, Address> = {
    "1": "0xbA1333333333a1BA1108E8412f11850A5C319bA9",
    "10": "0xbA1333333333a1BA1108E8412f11850A5C319bA9",
    "100": "0xbA1333333333a1BA1108E8412f11850A5C319bA9",
    "8453": "0xbA1333333333a1BA1108E8412f11850A5C319bA9",
    "42161": "0xbA1333333333a1BA1108E8412f11850A5C319bA9",
    "43114": "0xba1333333333cbcdB5D83c2e5d1D898E07eD00Dc",
    "11155111": "0xbA1333333333a1BA1108E8412f11850A5C319bA9"
};

// V3
export const VAULT_ADMIN: Record<number, Address> = {
    "1": "0x35fFB749B273bEb20F40f35EdeB805012C539864",
    "10": "0x35fFB749B273bEb20F40f35EdeB805012C539864",
    "100": "0x35fFB749B273bEb20F40f35EdeB805012C539864",
    "8453": "0x35fFB749B273bEb20F40f35EdeB805012C539864",
    "42161": "0x35fFB749B273bEb20F40f35EdeB805012C539864",
    "43114": "0x73F136bD5353F067efF3E2E1dA552f132E88Ef06",
    "11155111": "0x35fFB749B273bEb20F40f35EdeB805012C539864"
};

// V3
export const WEIGHTED_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    "1": "0x201efd508c8DfE9DE1a13c2452863A78CB2a86Cc",
    "10": "0x0f08eEf2C785AA5e7539684aF04755dEC1347b7c",
    "100": "0xEB1eeaBF0126d813589C3D2CfeFFE410D9aE3863",
    "8453": "0x5cF4928a3205728bd12830E1840F7DB85c62a4B9",
    "42161": "0xD961E30156C2E0D0d925A0De45f931CB7815e970",
    "43114": "0x7Ba29fE8E83dd6097A7298075C4AFfdBda3121cC",
    "11155111": "0x7532d5a3bE916e4a4D900240F49F0BABd4FD855C"
};

// V3
export const STABLE_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    "1": "0xe42C2E153BB0A8899b59C73F5Ff941f9742F1197",
    "10": "0x268E2EE1413D768b6e2dc3F5a4ddc9Ae03d9AF42",
    "100": "0x161f4014C27773840ccb4EC1957113e6DD028846",
    "8453": "0xC49Ca921c4CD1117162eAEEc0ee969649997950c",
    "42161": "0x44d33798dddCdAbc93Fe6a40C80588033Dc502d3",
    "43114": "0x1702067424096F07A60e62cceE3dE9420068492D",
    "11155111": "0xc274A11E09a3c92Ac64eAff5bEC4ee8f5dfEe207"
};

// V3
export const STABLE_SURGE_FACTORY: Record<number, Address> = {
    "1": "0xD53F5d8d926fb2a0f7Be614B16e649B8aC102D83",
    "100": "0x268E2EE1413D768b6e2dc3F5a4ddc9Ae03d9AF42",
    "8453": "0x4fb47126Fa83A8734991E41B942Ac29A3266C968",
    "42161": "0x86e67E115f96DF37239E0479441303De0de7bc2b",
    "11155111": "0xD516c344413B4282dF1E4082EAE6B1081F3b1932"
};

export const GYROECLP_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    "1": "0xE9B0a3bc48178D7FE2F5453C8bc1415d73F966d0",
    "10": "0x22625eEDd92c81a219A83e1dc48f88d54786B017",
    "100": "0xEa924b45a3fcDAAdf4E5cFB1665823B8F8F2039B",
    "8453": "0x5F6848976C2914403B425F18B589A65772F082E3",
    "42161": "0x88ED12A90142fDBFe2a28f7d5b48927254C7e760",
    "43114": "0x83E443EF4f9963C77bd860f94500075556668cb8",
    "11155111": "0x589cA6855C348d831b394676c25B125BcdC7F8ce"
};

// V3
export const BALANCER_ROUTER: Record<number, Address> = {
    "1": "0xAE563E3f8219521950555F5962419C8919758Ea2",
    "10": "0xe2fa4e1d17725e72dcdAfe943Ecf45dF4B9E285b",
    "100": "0x4eff2d77D9fFbAeFB4b141A3e494c085b3FF4Cb5",
    "8453": "0x3f170631ed9821Ca51A59D996aB095162438DC10",
    "42161": "0xEAedc32a51c510d35ebC11088fD5fF2b47aACF2E",
    "43114": "0x4bdCc2fb18AEb9e2d281b0278D946445070EAda7",
    "11155111": "0x5e315f96389C1aaF9324D97d3512ae1e0Bf3C21a"
};

// V3
export const BALANCER_BATCH_ROUTER: Record<number, Address> = {
    "1": "0x136f1EFcC3f8f88516B9E94110D56FDBfB1778d1",
    "10": "0xaD89051bEd8d96f045E8912aE1672c6C0bF8a85E",
    "100": "0xe2fa4e1d17725e72dcdAfe943Ecf45dF4B9E285b",
    "8453": "0x85a80afee867aDf27B50BdB7b76DA70f1E853062",
    "42161": "0xaD89051bEd8d96f045E8912aE1672c6C0bF8a85E",
    "43114": "0xa523f47A933D5020b23629dDf689695AA94612Dc",
    "11155111": "0xC85b652685567C1B074e8c0D4389f83a2E458b1C"
};

// V3
export const BALANCER_COMPOSITE_LIQUIDITY_ROUTER_NESTED: Record<
    number,
    Address
> = {
    [ChainId.SEPOLIA]: '0xc6674C0c7694E9b990eAc939E74F8cc3DD39B4b0',
    [ChainId.MAINNET]: '0x1CD776897ef4f647bf8241Ec69549e4A9cb1D608',
    [ChainId.GNOSIS_CHAIN]: '0xC1A64500E035D9159C8826E982dFb802003227f0',
    [ChainId.SONIC]: '0xcf21664262774eBB2C2b559e13b47F6cA10F3E65',
    [ChainId.ARBITRUM_ONE]: '0x1311Fbc9F60359639174c1e7cC2032DbDb5Cc4d1',
    [ChainId.BASE]: '0xf23b4DB826DbA14c0e857029dfF076b1c0264843',
    [ChainId.MONAD_TESTNET]: '0x36caC20dd805d128c1a6Dd16eeA845C574b5A17C',
    // [ChainId.AVALANCHE]: TODO once eployed,
};

// V3
export const BALANCER_COMPOSITE_LIQUIDITY_ROUTER_BOOSTED: Record<number, Address> = {
    "1": "0xb21A277466e7dB6934556a1Ce12eb3F032815c8A",
    "10": "0xc9b36096f5201ea332Db35d6D195774ea0D5988f",
    "100": "0x6eaD84Af26E997D27998Fc9f8614e8a19BB93938",
    "8453": "0x9dA18982a33FD0c7051B19F0d7C76F2d5E7e017c",
    "42161": "0xC1A64500E035D9159C8826E982dFb802003227f0",
    "43114": "0x96484f2aBF5e58b15176dbF1A799627B53F13B6d",
    "11155111": "0x6A20a4b6DcFF78e6D21BF0dbFfD58C96644DB9cb"
};

// V3
export const BALANCER_BUFFER_ROUTER: Record<number, Address> = {
    "1": "0x9179C06629ef7f17Cb5759F501D89997FE0E7b45",
    "10": "0x311334883921Fb1b813826E585dF1C2be4358615",
    "100": "0x86e67E115f96DF37239E0479441303De0de7bc2b",
    "8453": "0x4132f7AcC9dB7A6cF7BE2Dd3A9DC8b30C7E6E6c8",
    "42161": "0x311334883921Fb1b813826E585dF1C2be4358615",
    "43114": "0x6817149cb753BF529565B4D023d7507eD2ff4Bc0",
    "11155111": "0xb5F3A41515457CC6E2716c62a011D260441CcfC9"
};

// TODO: Figure out Authorizer addresses
export const AUTHORIZER: Record<number, Address> = {
    [ChainId.SEPOLIA]: '0xa331d84ec860bf466b4cdccfb4ac09a1b43f3ae6',
};

export const ADMIN_OF_AUTHORIZER = '0x171C0fF5943CE5f133130436A29bF61E26516003';


export const GYRO2CLP_POOL_FACTORY_BALANCER_V3: Record<number, Address> = {
    "1": "0xb96524227c4B5Ab908FC3d42005FE3B07abA40E9",
    "10": "0x4b979eD48F982Ba0baA946cB69c1083eB799729c",
    "100": "0x7fA49Df302a98223d98D115fc4FCD275576f6faA",
    "8453": "0xf5CDdF6feD9C589f1Be04899F48f9738531daD59",
    "42161": "0x65A22Ec32c37835Ad5E77Eb6f7452Ac59E113a9F",
    "43114": "0x8e3fEaAB11b7B351e3EA1E01247Ab6ccc847dD52",
    "11155111": "0x38ce8e04EBC04A39BED4b097e8C9bb8Ca74e33d8"
};