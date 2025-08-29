import { merge } from 'ts-deepmerge';
import { faker } from '@faker-js/faker';
import { ConfigService } from '@nestjs/config';
import { LoggerMarkers } from 'src/modules/common';
import { DateTimestamp } from 'src/modules/date-timestamp';
import { MockConfigService } from 'tests/nestjs';
import { logRecordFactory } from 'tests/modules/elk-logger';
import { ElkLoggerConfig } from '../../services/elk-logger.config';
import { PruneConfig } from '../prune.config';
import { PruneFormatter } from './prune.formatter';
import { PruneMarkers, PruneMessages } from '../../types/prune.types';

describe(PruneFormatter.name, () => {
  let configService: ConfigService;
  let loggerConfig: ElkLoggerConfig;
  let pruneConfig: PruneConfig;
  let formatter: PruneFormatter;

  beforeAll(async () => {
    configService = new MockConfigService({
      LOGGER_PRUNE_ENABLED: 'yes',
      LOGGER_PRUNE_MAX_FIELDS: '5',
      LOGGER_PRUNE_MAX_DEPTH: '7',
      LOGGER_PRUNE_APPLY_FOR_FORMATS: 'FULL,SIMPLE',
      LOGGER_PRUNE_MAX_LENGTH_FIELDS: '--array--=2,--default--=6,fileBody=7',
      LOGGER_FORMAT_RECORD: 'SIMPLE',
    }) as undefined as ConfigService;

    loggerConfig = new ElkLoggerConfig(configService, [], []);
    pruneConfig = new PruneConfig(configService, loggerConfig);

    formatter = new PruneFormatter(pruneConfig);
  });

  it('init', async () => {
    expect(formatter).toBeDefined();

    expect({
      isApplyPrune: pruneConfig.isApplyPrune(),
      getMaxDepth: pruneConfig.getMaxDepth(),
      getMaxCountFields: pruneConfig.getMaxCountFields(),
      getLengthField: {
        fileBody: pruneConfig.getLengthField('fileBody'),
        any: pruneConfig.getLengthField(),
      },
      getLengthArray: {
        fileBody: pruneConfig.getLengthArray('fileBody'),
        any: pruneConfig.getLengthArray(),
      },
      isIgnoreObject: loggerConfig.isIgnoreObject(new DateTimestamp()),
    }).toEqual({
      isApplyPrune: true,
      getMaxDepth: 7,
      getMaxCountFields: 5,
      getLengthField: {
        fileBody: 7,
        any: 6,
      },
      getLengthArray: {
        fileBody: 7,
        any: 2,
      },
      isIgnoreObject: true,
    });
  });

  it('transform', async () => {
    const error = new Error('test');
    const fileBody = faker.string.sample({ min: 10, max: 20 });
    const time = new Date();
    const programs = [1, 3, '56', 456, 'tg', 12, 56, 91, 223, 5467];

    const logRecord = logRecordFactory.build({
      markers: [LoggerMarkers.REQUEST],
      payload: {
        details: ['start process'],
        programs,
        request: {
          body: {
            time,
            programs,
            fileBody,
          },
        },
        error,
      },
    });

    const copyLogRecord = merge({}, logRecord);
    const encodeLogRecord = formatter.transform(logRecord);

    expect(logRecord).toEqual(copyLogRecord);
    expect(encodeLogRecord).toEqual({
      ...logRecord,
      markers: logRecord.markers.concat([
        PruneMarkers.LIMIT_LENGTH,
        PruneMarkers.LIMIT_LENGTH_ARRAY,
        PruneMarkers.LIMIT_DEPTH,
      ]),
      payload: {
        details: ['start ' + PruneMessages.LIMIT_LENGTH],
        programs: [1, 3, PruneMessages.LIMIT_LENGTH_ARRAY],
        request: {
          body: {
            time,
            programs: [PruneMessages.LIMIT_DEPTH],
            fileBody: fileBody.slice(0, pruneConfig.getLengthField('fileBody')) + PruneMessages.LIMIT_LENGTH,
          },
        },
        error,
      },
    });
  });
});
