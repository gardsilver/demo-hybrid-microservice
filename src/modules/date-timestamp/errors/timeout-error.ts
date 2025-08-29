import { MILLISECONDS_IN_SECOND } from '../types/constants';

export class TimeoutError extends Error {
  constructor(message?: string | number) {
    super(
      message === undefined
        ? 'Timeout'
        : typeof message === 'string'
          ? message
          : `Timeout (${Number(message) / MILLISECONDS_IN_SECOND} sec)`,
    );
    this.name = 'TimeoutError';
  }
}
