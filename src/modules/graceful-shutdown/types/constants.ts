export const GRACEFUL_SHUTDOWN_ON_EVENT_KEY = 'gracefulShutdownOnEventKey';
export const GRACEFUL_SHUTDOWN_ON_COUNT_KEY = 'gracefulShutdownOnCountKey';

export const GRACEFUL_SHUTDOWN_DEFAULT_OPTIONS = {
  timeoutBeforeDestroy: 10_000,
  timeoutDestroy: 30_000,
  timeoutAfterDestroy: 10_000,
  gracePeriod: 15_000,
};
