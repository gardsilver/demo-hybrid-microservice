import { openSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { DATE_BASE_FORMAT, DateTimestamp } from 'src/modules/date-timestamp';
import { CheckObjectsType, ConfigServiceHelper, MomentCheckObject, isObjectInstanceOf } from 'src/modules/common';
import { LogFormat, LogLevel, ILogFields } from '../types/elk-logger.types';

export class ElkLoggerConfig {
  private formatLogRecord!: LogFormat;
  private ignoreModules: string[] = [];
  private logLevels: LogLevel[] = [];
  private timestampFormat: string = '';
  private storeFilePath: string | null = null;
  private fileDescriptor: number | undefined;
  private readonly ignoreObjects: CheckObjectsType[];
  private readonly sortFields: string[];

  constructor(
    configService: ConfigService,
    ignoreObjects: CheckObjectsType[],
    sortFields: string[],
    private readonly defaultFields?: ILogFields,
  ) {
    this.initByEnvs(configService);

    this.ignoreObjects = [...ignoreObjects, Error, DateTimestamp, new MomentCheckObject()];

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
      .filter((level) => validLogLevels.includes(level as unknown as LogLevel));

    this.timestampFormat = configService
      .get<string>(configServiceHelper.getKeyName('FORMAT_TIMESTAMP'), DATE_BASE_FORMAT)
      .trim();

    this.setStoreFile(configService.get<string>(configServiceHelper.getKeyName('STORE_FILE'))?.trim());
  }

  public setStoreFile(filePath?: string): void {
    this.storeFilePath = filePath || null;
    if (this.storeFilePath !== null) {
      this.fileDescriptor = openSync(this.storeFilePath, 'a');
    } else {
      this.fileDescriptor = undefined;
    }
  }

  getDefaultFields(): ILogFields {
    return Object.assign({}, this.defaultFields);
  }

  getFileDescriptor(): number | undefined {
    return this.fileDescriptor;
  }

  getFormatLogRecord(): LogFormat {
    return this.formatLogRecord;
  }

  getIgnoreModules(): string[] {
    return [...this.ignoreModules];
  }

  setLogLevels(logLevels: LogLevel[]): ElkLoggerConfig {
    this.logLevels = logLevels;

    return this;
  }

  getLogLevels(): LogLevel[] {
    return [...this.logLevels];
  }

  getTimestampFormat(): string {
    return this.timestampFormat;
  }

  getIgnoreObjects(): Array<CheckObjectsType> {
    return [...this.ignoreObjects];
  }

  isIgnoreObject(obj: object): boolean {
    return !Object.keys(obj).length || isObjectInstanceOf(obj, this.getIgnoreObjects());
  }

  getSortFields(): string[] {
    return [...this.sortFields];
  }
}
