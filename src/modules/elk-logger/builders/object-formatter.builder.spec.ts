import { ConfigService } from '@nestjs/config';
import { MockConfigService } from 'tests/nestjs';
import { MockErrorFormatter, MockObjectFormatter } from 'tests/modules/elk-logger';
import { ElkLoggerConfig } from '../services/elk-logger.config';
import { ErrorObjectFormatter } from '../formatters/objects/error.object-formatter';
import { ObjectFormatter } from '../formatters/records/object.formatter';
import { ObjectFormatterBuilder } from './object-formatter.builder';
import { UnknownFormatter } from '../formatters/objects/unknown-formatter';
import { AggregateErrorObjectFormatter } from '../formatters/objects/aggregate-error.object-formatter';

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
    expect(formatter['unknownFormatter'] instanceof UnknownFormatter).toBeTruthy();

    const unknownFormatter: UnknownFormatter = formatter['unknownFormatter'] as undefined as UnknownFormatter;

    expect(unknownFormatter['objectFormatters']?.length).toBe(1);
    expect(unknownFormatter['objectFormatters'][0] instanceof ErrorObjectFormatter).toBeTruthy();

    const errorObjectFormatter: ErrorObjectFormatter = unknownFormatter[
      'objectFormatters'
    ][0] as undefined as ErrorObjectFormatter;

    expect(errorObjectFormatter['unknownFormatter']).toEqual(unknownFormatter);
    expect(errorObjectFormatter['exceptionFormatters'].length).toBe(1);
    expect(errorObjectFormatter['exceptionFormatters'][0] instanceof AggregateErrorObjectFormatter).toBeTruthy();
    expect(errorObjectFormatter['exceptionFormatters'][0]['unknownFormatter']).toEqual(unknownFormatter);
  });

  it('build custom', async () => {
    const formatter = ObjectFormatterBuilder.build(loggerConfig, {
      exceptionFormatters: [new MockErrorFormatter('error')],
      objectFormatters: [new MockObjectFormatter('object')],
    });

    expect(formatter instanceof ObjectFormatter).toBeTruthy();
    expect(formatter['unknownFormatter'] instanceof UnknownFormatter).toBeTruthy();

    const unknownFormatter: UnknownFormatter = formatter['unknownFormatter'] as undefined as UnknownFormatter;

    expect(unknownFormatter['objectFormatters']?.length).toBe(2);
    expect(unknownFormatter['objectFormatters'][0] instanceof MockObjectFormatter).toBeTruthy();
    expect(unknownFormatter['objectFormatters'][0]['fieldName']).toBe('object');

    expect(unknownFormatter['objectFormatters'][1] instanceof ErrorObjectFormatter).toBeTruthy();

    const errorObjectFormatter: ErrorObjectFormatter = unknownFormatter[
      'objectFormatters'
    ][1] as undefined as ErrorObjectFormatter;

    expect(errorObjectFormatter['unknownFormatter']).toEqual(unknownFormatter);
    expect(errorObjectFormatter['exceptionFormatters'].length).toBe(2);

    expect(errorObjectFormatter['exceptionFormatters'][0] instanceof AggregateErrorObjectFormatter).toBeTruthy();
    expect(errorObjectFormatter['exceptionFormatters'][0]['unknownFormatter']).toEqual(unknownFormatter);

    expect(errorObjectFormatter['exceptionFormatters'][1] instanceof MockErrorFormatter).toBeTruthy();
    expect(errorObjectFormatter['exceptionFormatters'][1]['fieldName']).toBe('error');
  });
});
