# SDK

[![npm version](https://img.shields.io/npm/v/@balancer/sdk/latest.svg)](https://www.npmjs.com/package/@balancer/sdk/v/latest)

WIP SDK for Balancer Protocol. Interfaces may have frequent breaking changes until a stable release.

## Local Setup

`pnpm install`

### Requirements

- `fetch`

### Polyfill

If your platform does not support one of the required features, it is also possible to import a polyfill.

- `fetch` -> [node-fetch](https://github.com/node-fetch/node-fetch#providing-global-access)

## Testing

`pnpm test`

Testing runs against a local anvil fork and requires the following RPC URL to be configured in your .env file:
```
ETHEREUM_RPC_URL
POLYGON_RPC_URL
FANTOM_RPC_URL
SEPOLIA_RPC_URL
```
### Anvil Client

To download and install the anvil client, run the following commands (MacOS):
- `curl -L https://foundry.paradigm.xyz | bash`
- `brew install libusb`
- `source /Users/$(whoami)/.zshenv`
- `foundryup`

## Documentation

In-depth documentation on this SDK is available at [docs-v3.balancer.fi/developer-reference/sdk](https://docs-v3.balancer.fi/developer-reference/sdk/).