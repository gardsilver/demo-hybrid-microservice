import { openSync } from 'fs';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DATE_BASE_FORMAT, DateTimestamp } from 'src/modules/date-timestamp';
import { CheckObjectsType, ConfigServiceHelper, MomentCheckObject, isObjectInstanceOf } from 'src/modules/common';
import { LogFormat, LogLevel, ILogFields } from '../types/elk-logger.types';
import { ELK_IGNORE_FORMATTER_OBJECTS_DI, ELK_SORT_FIELDS_DI, ELK_DEFAULT_FIELDS_DI } from '../types/tokens';

@Injectable()
export class ElkLoggerConfig {
  private formatLogRecord: LogFormat;
  private ignoreModules: string[];
  private logLevels: LogLevel[];
  private timestampFormat: string;
  private storeFilePath: string;
  private fileDescriptor: number;
  private readonly ignoreObjects: Array<CheckObjectsType>;
  private readonly sortFields: string[];

  constructor(
    configService: ConfigService,
    @Inject(ELK_IGNORE_FORMATTER_OBJECTS_DI) ignoreObjects: Array<CheckObjectsType>,
    @Inject(ELK_SORT_FIELDS_DI) sortFields: string[],
    @Inject(ELK_DEFAULT_FIELDS_DI) private readonly defaultFields?: ILogFields,
  ) {
    this.initByEnvs(configService);

    this.ignoreObjects = [].concat(ignoreObjects.length > 0 ? ignoreObjects : []);

    if (!this.ignoreObjects.includes(Error)) {
      this.ignoreObjects.push(Error);
    }
    if (!this.ignoreObjects.includes(DateTimestamp)) {
      this.ignoreObjects.push(DateTimestamp);
    }
    if (!this.ignoreObjects.includes(MomentCheckObject)) {
      this.ignoreObjects.push(MomentCheckObject);
    }
    this.sortFields = sortFields.map((f) => f.trim()).filter((f) => f !== '' && f !== undefined);
  }

  private initByEnvs(configService: ConfigService) {
    const configServiceHelper = new ConfigServiceHelper(configService, 'LOGGER_');

    this.formatLogRecord = configService.get<LogFormat>(
      configServiceHelper.getKeyName('FORMAT_RECORD'),
      LogFormat.FULL,
    );

    if (![LogFormat.FULL, LogFormat.SIMPLE, LogFormat.SHORT, LogFormat.NULL].includes(this.formatLogRecord)) {
      configServiceHelper.error(configServiceHelper.getKeyName('FORMAT_RECORD'), this.formatLogRecord);
    }

    this.ignoreModules = configServiceHelper.parseArray('IGNORE_MODULES');

    const validLogLevels = Object.values(LogLevel);

    this.logLevels = <LogLevel[]>configServiceHelper
      .parseArray('LEVELS')
      .map((level) => level?.toUpperCase())
      .filter((level) => validLogLevels.includes(level as LogLevel as undefined));

    this.timestampFormat = configService
      .get<string>(configServiceHelper.getKeyName('FORMAT_TIMESTAMP'), DATE_BASE_FORMAT)
      .trim();

    this.setStoreFile(configService.get<string>(configServiceHelper.getKeyName('STORE_FILE'), null)?.trim());
  }

  public setStoreFile(filePath?: string): void {
    this.storeFilePath = filePath ?? null;
    if (this.storeFilePath !== null) {
      this.fileDescriptor = openSync(this.storeFilePath, 'a');
    } else {
      this.fileDescriptor = undefined;
    }
  }

  getDefaultFields(): ILogFields {
    return Object.assign({}, this.defaultFields);
  }

  getFileDescriptor(): number {
    return this.fileDescriptor;
  }

  getFormatLogRecord(): LogFormat {
    return this.formatLogRecord;
  }

  getIgnoreModules(): string[] {
    return [].concat(this.ignoreModules);
  }

  setLogLevels(logLevels: LogLevel[]): ElkLoggerConfig {
    this.logLevels = logLevels;

    return this;
  }

  getLogLevels(): LogLevel[] {
    return [].concat(this.logLevels);
  }

  getTimestampFormat(): string {
    return this.timestampFormat;
  }

  getIgnoreObjects(): Array<CheckObjectsType> {
    return [].concat(this.ignoreObjects);
  }

  isIgnoreObject(obj: object): boolean {
    return !Object.keys(obj).length || isObjectInstanceOf(obj, this.getIgnoreObjects());
  }

  getSortFields(): string[] {
    return [].concat(this.sortFields);
  }
}
