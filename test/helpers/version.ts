// Helper module for providing package version in tests
import pkg from '../../package.json';

// Export the package version for use in tests
export const packageVersion = pkg.version;

// Define it as a global variable for tests
// @ts-ignore - intentionally adding to global scope
global.__PACKAGE_VERSION__ = pkg.version;
