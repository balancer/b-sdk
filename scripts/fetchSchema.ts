import { writeFileSync, readFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { API_ENDPOINT as ENDPOINT } from '../src/utils/constants'

/**
 * Fetch and cache the full GraphQL introspection schema.
 *
 * Why:
 * - Validate our query documents against the real API schema to catch drift early.
 * - Enable optional GraphQL code generation without requiring network at build time.
 * - Support feature detection in tests/tooling (e.g., presence of fields/args/enums).
 *
 * Behavior:
 * - Uses the full introspection query (embedded; no graphql dependency needed).
 * - Writes to src/data/providers/balancer-api/__schema__/schema.introspection.json.
 * - Respects a 24h TTL; if the cache is fresh, skips fetching to reduce API load.
 */
const OUT = resolve(
  process.cwd(),
  'src/data/providers/balancer-api/__schema__/schema.introspection.json',
);
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Full introspection query (no graphql dependency required)

const introspectionQuery = `
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          name
          description
          type { kind name ofType { kind name ofType { kind name } } }
          defaultValue
          deprecationReason
        }
        type { kind name ofType { kind name ofType { kind name } } }
        isDeprecated
        deprecationReason
      }
      inputFields {
        name
        description
        type { kind name ofType { kind name ofType { kind name } } }
        defaultValue
        deprecationReason
      }
      interfaces { kind name ofType { kind name ofType { kind name } } }
      enumValues(includeDeprecated: true) {
        name
        description
        isDeprecated
        deprecationReason
      }
      possibleTypes { kind name ofType { kind name ofType { kind name } } }
    }
    directives {
      name
      description
      isRepeatable
      locations
      args {
        name
        description
        type { kind name ofType { kind name ofType { kind name } } }
        defaultValue
        deprecationReason
      }
    }
  }
}`;

function isFresh(path: string, ttlMs: number): boolean {
  if (!existsSync(path)) return false;
  const ageMs = Date.now() - statSync(path).mtimeMs;
  return ageMs < ttlMs;
}

async function main() {
  if (isFresh(OUT, TTL_MS)) {
    console.log('Schema cache is fresh; skipping fetch.');
    return;
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: introspectionQuery }),
  });
  if (!res.ok) throw new Error(`Introspection failed: ${res.status}`);
  const json = await res.json();
  // Ensure target directory exists
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(json, null, 2));
  console.log('Schema written to', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});