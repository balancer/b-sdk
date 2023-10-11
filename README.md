# SDK

WIP upgrade of the SDK. Not meant for production usage yet and interfaces may have frequent breaking changes until a stable release.

## Setup

`pnpm install`

### Requirements

- `fetch`

### Polyfill

If your platform does not support one of the required features, it is also possible to import a polyfill.

- `fetch` -> [node-fetch](https://github.com/node-fetch/node-fetch#providing-global-access)

## Testing

Testing requires access to an archive node for onchain quote comparisons. This can be done using Infura.

`pnpm test`

## Anvil client
To download and install the anvil client, run the following commands (MacOS):
- `curl -L https://foundry.paradigm.xyz | bash`
- `brew install libusb`
- `source /Users/$(whoami)/.zshenv`
- `foundryup`

For other SO's check https://book.getfoundry.sh/getting-started/installation
```
