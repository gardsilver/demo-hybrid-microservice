import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceHelper } from 'src/modules/common';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import { LogFormat } from '../types/elk-logger.types';
import { FieldTypes } from '../types/prune.types';

@Injectable()
export class PruneConfig {
  private isEnabled: boolean | string;
  private applyForFormats: LogFormat[];
  private maxCountFields: number;
  private maxDepth: number;
  private maxLengthFields: Record<string, number>;

  constructor(
    configService: ConfigService,
    private readonly elkLoggerConfig: ElkLoggerConfig,
  ) {
    const configServiceHelper = new ConfigServiceHelper(configService, 'LOGGER_PRUNE_');
    const enabledRaw = configService.get<string>(configServiceHelper.getKeyName('ENABLED'), 'no').trim();

    if (['yes', 'no'].includes(enabledRaw.toLowerCase())) {
      this.isEnabled = enabledRaw.toLowerCase() === 'yes';
    } else {
      this.isEnabled = enabledRaw === '' ? false : enabledRaw;
    }

    this.maxCountFields = configServiceHelper.parseInt('MAX_FIELDS', 0);
    this.maxCountFields = this.maxCountFields > 0 ? this.maxCountFields : Infinity;

    this.maxDepth = configServiceHelper.parseInt('MAX_DEPTH', 0);
    this.maxDepth = this.maxDepth > 0 ? this.maxDepth : Infinity;

    this.applyForFormats = configServiceHelper
      .parseArray('APPLY_FOR_FORMATS')
      .map((format) => format.trim() as undefined as LogFormat)
      .filter((format) => !!format);

    this.maxLengthFields = configServiceHelper.parseArray('MAX_LENGTH_FIELDS').reduce((store, limit) => {
      const [fieldName, lim] = limit.split('=').map((val) => val.trim());
      if (fieldName) {
        const val = Number(lim);

        store[fieldName] = val > 0 ? val : Infinity;
      }

      return store;
    }, {});
  }

  getElkLoggerConfig(): ElkLoggerConfig {
    return this.elkLoggerConfig;
  }

  getLengthArray(key?: string): number {
    return key
      ? (this.maxLengthFields[key] ??
          this.maxLengthFields[FieldTypes.ARRAY] ??
          this.maxLengthFields[FieldTypes.DEFAULT] ??
          Infinity)
      : (this.maxLengthFields[FieldTypes.ARRAY] ?? this.maxLengthFields[FieldTypes.DEFAULT] ?? Infinity);
  }

  getLengthField(key?: string): number {
    return key
      ? (this.maxLengthFields[key] ?? this.maxLengthFields[FieldTypes.DEFAULT] ?? Infinity)
      : (this.maxLengthFields[FieldTypes.DEFAULT] ?? Infinity);
  }

  getMaxCountFields(): number {
    return this.maxCountFields;
  }

  getMaxDepth(): number {
    return this.maxDepth;
  }

  isApplyPrune(): boolean {
    return this.applyForFormats.includes(this.elkLoggerConfig.getFormatLogRecord());
  }

  getMaxLengthPruneEncoder(): number {
    if (this.isEnabled === false) {
      return Infinity;
    }

    return this.getLengthField(typeof this.isEnabled === 'string' ? this.isEnabled : undefined);
  }
}
