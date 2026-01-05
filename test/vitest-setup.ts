import './helpers/version';
import { afterAll } from 'vitest';
import { stopAnvilForks } from './anvil/anvil-global-setup';
import { sleep } from './lib/utils/promises';

// Clean up all anvil forks after each test file completes
// This ensures each test file starts with a fresh fork at the correct block number
afterAll(async () => {
    await stopAnvilForks();
    // Give the OS time to release ports before the next test file starts
    await sleep(1000);
});
