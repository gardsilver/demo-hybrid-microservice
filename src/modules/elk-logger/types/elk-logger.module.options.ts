import { Provider } from '@nestjs/common';
import {
  ImportsType,
  ServiceClassProvider,
  ServiceFactoryProvider,
  ServiceValueProvider,
  CheckObjectsType,
} from 'src/modules/common';
import { ILogFields, ILogRecordFormatter, IEncodeFormatter, ObjectFormatter, ErrorFormatter } from './elk-logger.types';

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
      | ServiceClassProvider<ErrorFormatter[]>
      | ServiceValueProvider<ErrorFormatter[]>
      | ServiceFactoryProvider<ErrorFormatter[]>;
    objectFormatters?:
      | ServiceClassProvider<ObjectFormatter[]>
      | ServiceValueProvider<ObjectFormatter[]>
      | ServiceFactoryProvider<ObjectFormatter[]>;
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
