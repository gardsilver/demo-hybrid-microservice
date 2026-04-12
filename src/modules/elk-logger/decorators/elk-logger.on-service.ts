import { ILogFields } from '../types/elk-logger.types';

export const ELK_LOGGER_CONFIG_KEY = 'elkLoggerConfigKey';

export type ElkLoggerOptions = {
  fields: ILogFields | false;
};

export type ElkLoggerBuilderOptions = {
  fields: ILogFields | (() => ILogFields);
};

abstract class ElkLoggerOptionsBuilder {
  public static build<C extends object>(options: C | (() => C)): C | false {
    if (typeof options === 'function') {
      return options();
    }

    return options;
  }
}

export const ElkLoggerOnService = (option: ElkLoggerBuilderOptions): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(
      ELK_LOGGER_CONFIG_KEY,
      {
        fields: ElkLoggerOptionsBuilder.build(option.fields),
      } as ElkLoggerOptions,
      target,
    );
  };
};

export const getElkLoggerOptions = (target: object): ElkLoggerOptions => {
  const option: ElkLoggerOptions = Reflect.getMetadata(ELK_LOGGER_CONFIG_KEY, target.constructor);

  return {
    ...option,
    fields: option?.fields ?? false,
  };
};
