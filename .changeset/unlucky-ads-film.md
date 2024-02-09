---
"@balancer/sdk": minor
---

Adds Balancer's V3 CreatePool functionality for Weighted Pools;
Adds tests for the V3's Create Weighted Pool;
Adds example for V3's Create Weighted Pool;
Renames factories references to differ by balancer version instead of pool version, or no differentiation;
Adapts createPoolHelper to work with V3;
Adds TokenType enum;
Add another validation step for V3's Create Weighted Pool input(rateProvider cannot be zero if tokenType is not STANDARD);
