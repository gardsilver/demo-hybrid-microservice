import { Provider } from '@nestjs/common';
import {
  ImportsType,
  IServiceClassProvider,
  IServiceFactoryProvider,
  IServiceValueProvider,
  CheckObjectsType,
} from 'src/modules/common';
import { ILogFields, ILogRecordFormatter, IEncodeFormatter } from './elk-logger.types';
import { BaseErrorObjectFormatter } from '../formatters/objects/base-error.object-formatter';
import { BaseObjectFormatter } from '../formatters/objects/base.object-formatter';

export interface IElkLoggerModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  defaultFields?: ILogFields;
  formattersOptions?: {
    ignoreObjects?:
      | IServiceClassProvider<CheckObjectsType[]>
      | IServiceValueProvider<CheckObjectsType[]>
      | IServiceFactoryProvider<CheckObjectsType[]>;
    sortFields?: string[];
    exceptionFormatters?:
      | IServiceClassProvider<BaseErrorObjectFormatter[]>
      | IServiceValueProvider<BaseErrorObjectFormatter[]>
      | IServiceFactoryProvider<BaseErrorObjectFormatter[]>;
    objectFormatters?:
      | IServiceClassProvider<BaseObjectFormatter[]>
      | IServiceValueProvider<BaseObjectFormatter[]>
      | IServiceFactoryProvider<BaseObjectFormatter[]>;
  };
  formatters?:
    | IServiceClassProvider<ILogRecordFormatter[]>
    | IServiceValueProvider<ILogRecordFormatter[]>
    | IServiceFactoryProvider<ILogRecordFormatter[]>;
  encoders?:
    | IServiceClassProvider<IEncodeFormatter[]>
    | IServiceValueProvider<IEncodeFormatter[]>
    | IServiceFactoryProvider<IEncodeFormatter[]>;
}
