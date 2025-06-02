import { stopAnvilForks } from './anvil/anvil-global-setup';
import './helpers/version';

afterAll(async () => {
    await stopAnvilForks();
});
