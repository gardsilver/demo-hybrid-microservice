import { Provider } from '@nestjs/common';
import {
  ImportsType,
  ServiceClassProvider,
  ServiceFactoryProvider,
  ServiceValueProvider,
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
      | ServiceClassProvider<CheckObjectsType[]>
      | ServiceValueProvider<CheckObjectsType[]>
      | ServiceFactoryProvider<CheckObjectsType[]>;
    sortFields?: string[];
    exceptionFormatters?:
      | ServiceClassProvider<BaseErrorObjectFormatter[]>
      | ServiceValueProvider<BaseErrorObjectFormatter[]>
      | ServiceFactoryProvider<BaseErrorObjectFormatter[]>;
    objectFormatters?:
      | ServiceClassProvider<BaseObjectFormatter[]>
      | ServiceValueProvider<BaseObjectFormatter[]>
      | ServiceFactoryProvider<BaseObjectFormatter[]>;
  };
  formatters?:
    | ServiceClassProvider<ILogRecordFormatter[]>
    | ServiceValueProvider<ILogRecordFormatter[]>
    | ServiceFactoryProvider<ILogRecordFormatter[]>;
  encoders?:
    | ServiceClassProvider<IEncodeFormatter[]>
    | ServiceValueProvider<IEncodeFormatter[]>
    | ServiceFactoryProvider<IEncodeFormatter[]>;
}
