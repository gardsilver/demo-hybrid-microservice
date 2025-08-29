export interface IHeaders {
  [key: string]: string | string[];
}

export interface IKeyValue<T = unknown> {
  [key: string]: T;
}
