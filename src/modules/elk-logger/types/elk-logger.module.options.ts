import { Provider } from '@nestjs/common';
import {
  ImportsType,
  ServiceClassProvider,
  ServiceFactoryProvider,
  ServiceValueProvider,
  CheckObjectsType,
} from 'src/modules/common';
import { ILogFields, ILogRecordFormatter, IEncodeFormatter, IObjectFormatter } from './elk-logger.types';

export interface IElkLoggerModuleOptions {
  imports?: ImportsType;
  providers?: Provider[];
  defaultFields?: ILogFields;
  formattersOptions?: {
    ignoreObjects?: Array<CheckObjectsType>;
    sortFields?: string[];
    exceptionFormatters?: IObjectFormatter[];
    objectFormatters?: IObjectFormatter[];
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
