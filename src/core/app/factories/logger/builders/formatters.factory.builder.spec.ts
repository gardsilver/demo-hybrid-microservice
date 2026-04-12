import { GeneralAsyncContextFormatter } from 'src/modules/common/formatters';
import { ElkLoggerConfig } from 'src/modules/elk-logger';
import { HttpSecurityHeadersFormatter } from 'src/modules/http/http-common';
import { FormattersFactoryBuilder } from './formatters.factory.builder';
import { FormattersFactory } from '../formatters.factory';

describe(FormattersFactoryBuilder.name, () => {
  let elkLoggerConfig: ElkLoggerConfig;

  beforeAll(async () => {
    elkLoggerConfig = {
      isIgnoreObject: () => false,
    } as unknown as ElkLoggerConfig;
  });

  it('build', async () => {
    const service = FormattersFactoryBuilder.build({ elkLoggerConfig });

    expect(service instanceof FormattersFactory).toBeTruthy();

    expect(service.getFormatters()).toEqual([
      new GeneralAsyncContextFormatter(),
      new HttpSecurityHeadersFormatter(elkLoggerConfig),
    ]);
  });
});
