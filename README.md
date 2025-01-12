# Balancer SDK

[![npm version](https://img.shields.io/npm/v/@balancer/sdk/latest.svg)](https://www.npmjs.com/package/@balancer/sdk/v/latest)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Overview

The Balancer SDK provides a powerful interface for interacting with the Balancer Protocol. This SDK enables developers to integrate Balancer's functionality into their applications, including pool management, trading, and liquidity provision.

> **Note**: This SDK is currently under active development. APIs may have breaking changes until we reach a stable release.

## Features

- Pool management and queries
- Trading operations
- Liquidity provision
- Multi-chain support (Ethereum, Polygon, Fantom, Sepolia)

## Installation

```bash
pnpm install @balancer/sdk
```

## Prerequisites

### Required Dependencies
- `fetch` - Required for HTTP requests

### Optional Polyfills

If your platform doesn't support required features, you can use these polyfills:
- For `fetch`: Use [node-fetch](https://github.com/node-fetch/node-fetch#providing-global-access)

## Development Setup

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

## Testing

Run the test suite:
```bash
pnpm test
```

### Testing Requirements

Tests run against a local anvil fork. Configure the following RPC URLs in your `.env` file:
```
ETHEREUM_RPC_URL=
POLYGON_RPC_URL=
FANTOM_RPC_URL=
SEPOLIA_RPC_URL=
```

### Setting up Anvil Client

#### MacOS Installation
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Install required dependency
brew install libusb

# Update shell configuration
source /Users/$(whoami)/.zshenv

# Update Foundry
foundryup
```

#### Other Platforms
Please refer to the [Foundry Book](https://book.getfoundry.sh/getting-started/installation) for installation instructions.

## Documentation

For comprehensive documentation, visit [docs-v3.balancer.fi/developer-reference/sdk](https://docs-v3.balancer.fi/developer-reference/sdk/).

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
