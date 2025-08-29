import { TimeoutError } from '../errors/timeout-error';

export const delay = (ms: number, callback?: () => void) => {
  let timer: NodeJS.Timeout;

  return new Promise(
    (resolve) =>
      (timer = setTimeout(() => {
        if (callback) {
          callback();
        }
        resolve(true);
      }, ms)),
  ).finally(() => {
    clearTimeout(timer);
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const promisesTimeout = (ms: number, ...promise: Promise<any>[]) => {
  let timer: NodeJS.Timeout;

  promise.push(new Promise((_, reject) => (timer = setTimeout(() => reject(new TimeoutError(ms)), ms))));

  return Promise.race(promise).finally(() => {
    clearTimeout(timer);
  });
};
