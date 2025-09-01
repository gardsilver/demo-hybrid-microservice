import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { MockObjectFormatter } from 'tests/modules/elk-logger';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import { ExceptionObjectFormatter } from '../formatters/objects/exception.object-formatter';
import { ObjectFormatter } from '../formatters/records/object.formatter';
import { ObjectFormatterBuilder } from './object-formatter.builder';

describe(ObjectFormatterBuilder.name, () => {
  let configService: ConfigService;
  let loggerConfig: ElkLoggerConfig;

  beforeEach(async () => {
    configService = new MockConfigService() as undefined as ConfigService;
    loggerConfig = new ElkLoggerConfig(configService, [], []);
  });

  it('build default', async () => {
    const formatter = ObjectFormatterBuilder.build(loggerConfig);

    expect(formatter instanceof ObjectFormatter).toBeTruthy();
    expect(formatter['objectFormatters']?.length).toBe(1);
    expect(formatter['objectFormatters'][0] instanceof ExceptionObjectFormatter).toBeTruthy();
    expect(formatter['objectFormatters'][0]['objectFormatters']).toEqual(formatter['objectFormatters']);
    expect(formatter['objectFormatters'][0]['exceptionFormatters'].length).toBe(0);
  });

  it('build custom', async () => {
    const formatter = ObjectFormatterBuilder.build(loggerConfig, {
      exceptionFormatters: [new MockObjectFormatter('error')],
      objectFormatters: [new MockObjectFormatter('object')],
    });

    expect(formatter instanceof ObjectFormatter).toBeTruthy();
    expect(formatter['objectFormatters']?.length).toBe(2);
    expect(formatter['objectFormatters'][0] instanceof MockObjectFormatter).toBeTruthy();
    expect(formatter['objectFormatters'][0]['fieldName']).toBe('object');
    expect(formatter['objectFormatters'][1] instanceof ExceptionObjectFormatter).toBeTruthy();
    expect(formatter['objectFormatters'][1]['objectFormatters']).toEqual(formatter['objectFormatters']);
    expect(formatter['objectFormatters'][1]['exceptionFormatters'].length).toBe(1);
    expect(formatter['objectFormatters'][1]['exceptionFormatters'][0] instanceof MockObjectFormatter).toBeTruthy();
    expect(formatter['objectFormatters'][1]['exceptionFormatters'][0]['fieldName']).toBe('error');
  });
});
