import { stopAnvilForks } from './anvil/anvil-global-setup';
import './helpers/version';

afterAll(async () => {
    console.log('afterAll');
    await stopAnvilForks();
});
