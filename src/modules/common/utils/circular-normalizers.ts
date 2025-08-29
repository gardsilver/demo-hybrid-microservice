import * as moment from 'moment';
import { Type } from '@nestjs/common';

export abstract class AbstractCheckObject<T extends object = object> {
  abstract isInstanceOf(obj: object): obj is T;
}

export class MomentCheckObject extends AbstractCheckObject<moment.Moment | moment.Duration | Date> {
  isInstanceOf(obj: object): obj is moment.Moment | moment.Duration | Date {
    return moment.isMoment(obj) || moment.isDuration(obj) || moment.isDate(obj);
  }
}

export type CheckObjectsType = Type | AbstractCheckObject;

export const isObjectInstanceOf = (obj: object, checkObjects: Array<CheckObjectsType>): boolean =>
  checkObjects.reduce(
    (result, type) => result || (type instanceof AbstractCheckObject ? type.isInstanceOf(obj) : obj instanceof type),
    false,
  );

/**
 * Если template == true, то будет использован шаблон для замены 'Circular[* {{index}}]',
 *   где {{index}} будет заменен на индекс объекта
 *
 * Если template является string, то будет использован пользовательский шаблон для замены
 *
 * Если template не задан, то будет заменено на значение value
 *
 */
interface CircularReplaceOption {
  template: true | string;
  value?: unknown;
}

/**
 *  Возвращает функцию для JSON.stringify()
 *  По умолчанию все циклические ссылки заменяются на void
 */
export const circularReplacerBuilder = (option?: CircularReplaceOption): ((key: string, value: unknown) => unknown) => {
  let indexRef = 0;
  const setObj = new WeakSet();
  const mapObj = new WeakMap();

  return (key: string, value: unknown): unknown => {
    if (value === null || !value || typeof value !== 'object') {
      return value;
    }

    if (setObj.has(value)) {
      if (option) {
        if (option.template) {
          const ind = mapObj.get(value);

          const template: string = option.template === true ? 'Circular[* {{index}}]' : option.template;

          return template.replace('{{index}}', ind);
        }

        return option.value;
      }

      return;
    }

    setObj.add(value);
    mapObj.set(value, ++indexRef);

    return value;
  };
};

/**
 *  ignoreObjects - массив классов, которые не требуют проверки на предмет циклических ссылок.
 */
interface CircularRemoveOption extends CircularReplaceOption {
  ignoreObjects?: Array<CheckObjectsType>;
}

/**
 *  Возвращает копию объекта obj в которой удалены / заменены все циклические ссылки
 */
export const circularRemove = (obj: unknown, option?: CircularRemoveOption): unknown => {
  if (obj === null || !obj || typeof obj !== 'object') {
    return obj;
  }

  let indexRef = 0;
  const setObj = new WeakSet();
  const mapObj = new WeakMap();

  const iterateObj = (value: unknown): void | unknown => {
    if (value === null || !value || typeof value !== 'object') {
      return value;
    }

    if (mapObj.has(value)) {
      if (option) {
        if (option.template) {
          const ind = mapObj.get(value);
          const template: string = option.template === true ? 'Circular[* {{index}}]' : option.template;

          return template.replace('{{index}}', ind);
        }

        return option.value;
      }

      return;
    }

    setObj.add(value);
    mapObj.set(value, ++indexRef);

    if (Array.isArray(value)) {
      return value.map((item) => iterateObj(item));
    }

    if (!Object.keys(value).length) {
      return value;
    }

    const ignore: boolean = option?.ignoreObjects?.length ? isObjectInstanceOf(value, option.ignoreObjects) : false;

    if (ignore) {
      return value;
    }

    const tgt = { ...value };

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const item = value[key];
        if (item === null || !item || typeof item !== 'object') {
          tgt[key] = item;

          continue;
        }

        tgt[key] = iterateObj(item);
      }
    }

    return tgt;
  };

  return iterateObj(obj);
};
