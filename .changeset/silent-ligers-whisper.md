---
"@balancer/sdk": patch
---

PriceImpact error handling and messaging improvements.
* Catch any errors with initial add/remove steps - these are thrown because the user input is valid, e.g. would cause INVARIANT_GROWTH errors
* Catch any errors in query during unbalanced calc steps and throw message that will help with debug - e.g. caused by delta amounts
