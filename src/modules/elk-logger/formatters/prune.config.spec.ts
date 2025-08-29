import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import { PruneConfig } from './prune.config';

describe(PruneConfig.name, () => {
  let configService: ConfigService;
  let loggerConfig: ElkLoggerConfig;
  let pruneConfig: PruneConfig;

  beforeEach(async () => {
    configService = undefined;
    loggerConfig = undefined;
    pruneConfig = undefined;
  });

  it('default', async () => {
    configService = new MockConfigService() as undefined as ConfigService;
    loggerConfig = new ElkLoggerConfig(configService, [], []);
    pruneConfig = new PruneConfig(configService, loggerConfig);

    expect({
      isEnabled: pruneConfig['isEnabled'],
      getElkLoggerConfig: pruneConfig.getElkLoggerConfig(),
      getLengthArray: {
        fileBody: pruneConfig.getLengthArray('fileBody'),
        any: pruneConfig.getLengthArray(),
      },
      getLengthField: {
        fileBody: pruneConfig.getLengthField('fileBody'),
        any: pruneConfig.getLengthField(),
      },
      getMaxCountFields: pruneConfig.getMaxCountFields(),
      getMaxDepth: pruneConfig.getMaxDepth(),
      isApplyPrune: pruneConfig.isApplyPrune(),
      getMaxLengthPruneEncoder: pruneConfig.getMaxLengthPruneEncoder(),
    }).toEqual({
      isEnabled: false,
      getElkLoggerConfig: loggerConfig,
      getLengthArray: {
        fileBody: Infinity,
        any: Infinity,
      },
      getLengthField: {
        fileBody: Infinity,
        any: Infinity,
      },
      getMaxCountFields: Infinity,
      getMaxDepth: Infinity,
      isApplyPrune: false,
      getMaxLengthPruneEncoder: Infinity,
    });
  });

  it('custom', async () => {
    configService = new MockConfigService({
      LOGGER_PRUNE_ENABLED: 'yes',
      LOGGER_PRUNE_MAX_FIELDS: '1',
      LOGGER_PRUNE_MAX_DEPTH: '2',
      LOGGER_PRUNE_APPLY_FOR_FORMATS: 'FULL,SIMPLE',
      LOGGER_PRUNE_MAX_LENGTH_FIELDS: '--array--=3,--default--=4,fileBody=5',
      LOGGER_FORMAT_RECORD: 'SHORT',
    }) as undefined as ConfigService;

    loggerConfig = new ElkLoggerConfig(configService, [], []);
    pruneConfig = new PruneConfig(configService, loggerConfig);

    expect({
      isEnabled: pruneConfig['isEnabled'],
      getLengthArray: {
        fileBody: pruneConfig.getLengthArray('fileBody'),
        any: pruneConfig.getLengthArray(),
      },
      getLengthField: {
        fileBody: pruneConfig.getLengthField('fileBody'),
        any: pruneConfig.getLengthField(),
      },
      getMaxCountFields: pruneConfig.getMaxCountFields(),
      getMaxDepth: pruneConfig.getMaxDepth(),
      isApplyPrune: pruneConfig.isApplyPrune(),
      getMaxLengthPruneEncoder: pruneConfig.getMaxLengthPruneEncoder(),
    }).toEqual({
      isEnabled: true,
      getLengthArray: {
        fileBody: 5,
        any: 3,
      },
      getLengthField: {
        fileBody: 5,
        any: 4,
      },
      getMaxCountFields: 1,
      getMaxDepth: 2,
      isApplyPrune: false,
      getMaxLengthPruneEncoder: 4,
    });
  });

  it('custom: isEnabled as fieldName', async () => {
    configService = new MockConfigService({
      LOGGER_PRUNE_ENABLED: 'fileBody',
      LOGGER_PRUNE_MAX_FIELDS: '1',
      LOGGER_PRUNE_MAX_DEPTH: '2',
      LOGGER_PRUNE_APPLY_FOR_FORMATS: 'FULL,SIMPLE',
      LOGGER_PRUNE_MAX_LENGTH_FIELDS: '--array--=3,--default--=4,fileBody=5',
      LOGGER_FORMAT_RECORD: 'SHORT',
    }) as undefined as ConfigService;

    loggerConfig = new ElkLoggerConfig(configService, [], []);
    pruneConfig = new PruneConfig(configService, loggerConfig);

    expect({
      isEnabled: pruneConfig['isEnabled'],
      getMaxLengthPruneEncoder: pruneConfig.getMaxLengthPruneEncoder(),
    }).toEqual({
      isEnabled: 'fileBody',
      getMaxLengthPruneEncoder: 5,
    });
  });
});
