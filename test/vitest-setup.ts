import { stopAnvilForks } from './anvil/anvil-global-setup';
import { sleep } from './lib/utils/promises';
import './helpers/version';

afterAll(async () => {
    await stopAnvilForks();
    // Give OS time to release the ports before next test file starts
    await sleep(500);
});
