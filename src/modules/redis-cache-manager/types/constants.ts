export const REDIS_CACHE_MANAGER_DEFAULT_OPTIONS = {
  ttl: 600_000,
  maxDelayBeforeReconnect: 1200_000,
  countForResetReconnectStrategy: 200,
  redisHost: 'redis',
};
