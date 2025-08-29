export type GracefulShutdownCountType = {
  service: string;
  method: string;
  duration?: number;
  isSuccess?: boolean;
};

export enum GracefulShutdownEvents {
  BEFORE_DESTROY = 'beforeDestroy',
  AFTER_DESTROY = 'afterDestroy',
}

export type GracefulShutdownEventMetadata = {
  event: GracefulShutdownEvents;
  message?: string;
};

export type GracefulShutdownCountMetadata = {
  instance: object;
  increment: ((metadata: GracefulShutdownCountType) => void) | (() => Promise<void>);
  decrement: ((metadata: GracefulShutdownCountType) => void) | (() => Promise<void>);
};

export type ResolveEventType = {
  service: string;
  method: string;
  isSuccess: boolean;
  message?: string;
};

export type ResultsEventType = {
  event: GracefulShutdownEvents;
  isSuccess: boolean;
  total: number;
  failed: number;
  details: Array<ResolveEventType>;
};

export type ResolveCountActiveProcessType = {
  service: string;
  method: string;
  count: number;
};

export type ResultsCountActiveProcessType = {
  total: number;
  details: Array<ResolveCountActiveProcessType>;
};
