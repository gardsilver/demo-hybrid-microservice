// Global jest setup: disables prom-client default metric collectors so open
// setImmediate/setInterval handles don't prevent worker processes from exiting.
//
// setupFiles runs before the jest test framework is installed, so we can't use
// jest.mock here — instead we patch the module directly on require.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const promClient = require('prom-client') as { collectDefaultMetrics: (...args: unknown[]) => unknown };

promClient.collectDefaultMetrics = () => undefined;
