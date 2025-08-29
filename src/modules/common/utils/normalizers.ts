// eslint-disable-next-line @typescript-eslint/no-require-imports
import Long = require('long');
import { inspect } from 'util';
import { Type } from '@nestjs/common';
import { Money } from 'protos/compiled/google/type/money';

export const moneyToKopecks = (money: Money): Long => {
  const kopecks = Long.fromNumber(money.nanos / 10_000_000);

  return Long.fromValue(money.units).mul(100).add(kopecks);
};

export const objToJsonString = (obj: unknown): string => inspect(obj, { depth: null });

export const isStaticMethod = (type: Type | object, methodName: string): boolean => {
  if (type === null || type === undefined) {
    return false;
  }

  return methodName in type && typeof type[methodName] === 'function' && !('get' in type) && !('set' in type);
};

export const enumKeys = <T extends object>(e: T) => {
  const keys = Object.keys(e);
  const isStringEnum = isNaN(Number(keys[0]));
  return isStringEnum ? keys : keys.slice(keys.length / 2);
};

export const enumValues = <T extends object>(e: T) => {
  const values = Object.values(e);
  const isNumEnum = e[e[values[0]]] === values[0];
  return isNumEnum ? values.slice(values.length / 2) : values;
};
