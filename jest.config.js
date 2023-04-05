/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testTimeout: 15000,
    maxWorkers: 1, // Needed to prevent bigint serialization errors
};
