import { stopAnvilForks } from '../test/anvil/anvil-global-setup';

const executeExample = async (filePath) => {
    const example = require(`../${filePath}`).default;
    await example();
    stopAnvilForks();
};

executeExample(process.argv[2]);
