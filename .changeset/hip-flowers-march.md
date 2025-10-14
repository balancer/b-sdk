---
"@balancer/sdk": major
---

**WHAT**: Removed wrapped token functionality from the `Token` class and introduced a new `NativeToken` class to handle native tokens (like ETH) separately.

**WHY**: This change improves type safety and separation of concerns by distinguishing between ERC-20 tokens and native tokens, making the API more explicit and preventing confusion about token types.

**HOW**: Update your code by:
- Replace any usage of `Token` for native tokens with the new `NativeToken` class if using the wrapped functionality
- If not using any wrapped functionality, the `Token` can remain as is
- Import `NativeToken` from the SDK: `import { NativeToken } from '@balancer/sdk'`
- Use `NativeToken` for native token operations instead of `Token` with wrapped functionality
