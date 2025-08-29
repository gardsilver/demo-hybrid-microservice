import { ConfigService } from '@nestjs/config';
import { MomentCheckObject } from 'src/modules/common';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { MockConfigService } from 'tests/nestjs';
import { MockEncodeFormatter, MockFormatter } from 'tests/modules/elk-logger';
import { FormattersFactory } from '../formatters/formatters.factory';
import { RecordEncodeFormattersFactory } from '../formatters/record-encode.formatters.factory';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import { INestElkLoggerServiceBuilderOption, NestElkLoggerServiceBuilder } from './nest-elk-logger.service.builder';
import { NestElkLoggerService } from '../services/nest-elk-logger.service';
import { ILogFields } from '../types/elk-logger.types';
import { CircularFormatter } from '../formatters/records/circular.formatter';
import { PruneEncoder } from '../formatters/encodes/prune.encoder';

describe(NestElkLoggerServiceBuilder.name, () => {
  let buildService: (option: INestElkLoggerServiceBuilderOption) => {
    elkLoggerConfig: ElkLoggerConfig;
    formattersFactory: FormattersFactory;
    recordEncodeFormattersFactory: RecordEncodeFormattersFactory;
  };

  beforeEach(async () => {
    buildService = NestElkLoggerServiceBuilder['buildService'];
  });

  describe('buildService', () => {
    it('default', async () => {
      const services = buildService({
        configService: new MockConfigService() as undefined as ConfigService,
      });

      expect(services.elkLoggerConfig instanceof ElkLoggerConfig).toBeTruthy();
      expect(services.formattersFactory instanceof FormattersFactory).toBeTruthy();
      expect(services.recordEncodeFormattersFactory instanceof RecordEncodeFormattersFactory).toBeTruthy();
    });

    it('custom', async () => {
      const services = buildService({
        configService: new MockConfigService() as undefined as ConfigService,
        formattersOptions: {
          ignoreObjects: [Error],
          sortFields: ['timestamp', 'level', 'module', 'message', 'traceId', 'payload'],
        },
        defaultFields: {
          module: 'TestModule',
          index: 'MyApplications',
        } as ILogFields,
        formatters: [new MockFormatter()],
        encoders: [new MockEncodeFormatter()],
      });

      const elkLoggerConfig = services.elkLoggerConfig;

      expect(elkLoggerConfig.getDefaultFields()).toEqual({
        module: 'TestModule',
        index: 'MyApplications',
      });
      expect(elkLoggerConfig.getIgnoreObjects()).toEqual([Error, DateTimestamp, MomentCheckObject]);
      expect(elkLoggerConfig.getSortFields()).toEqual([
        'timestamp',
        'level',
        'module',
        'message',
        'traceId',
        'payload',
      ]);

      const formatters = services.formattersFactory.getRecordFormatters();

      expect(formatters.length).toEqual(5);
      expect(formatters[0] instanceof CircularFormatter).toBeTruthy();
      expect(formatters[0]['elkLoggerConfig']).toEqual(elkLoggerConfig);

      const encodeFormatters = services.formattersFactory.getEncodeFormatters();
      expect(encodeFormatters.length).toEqual(2);
      expect(encodeFormatters[1] instanceof PruneEncoder).toBeTruthy();
      expect(encodeFormatters[1]['pruneConfig']['elkLoggerConfig']).toEqual(elkLoggerConfig);
    });
  });

  describe('build', () => {
    it('default', async () => {
      expect(NestElkLoggerServiceBuilder.build() instanceof NestElkLoggerService).toBeTruthy();
    });
  });
});
