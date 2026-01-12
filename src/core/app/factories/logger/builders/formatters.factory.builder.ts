import { GeneralAsyncContextFormatter } from 'src/modules/common/formatters';
import { ElkLoggerConfig } from 'src/modules/elk-logger';
import { HttpSecurityHeadersFormatter } from 'src/modules/http/http-common';
import { FormattersFactory } from '../formatters.factory';

export abstract class FormattersFactoryBuilder {
  public static build(options: { elkLoggerConfig: ElkLoggerConfig }): FormattersFactory {
    return new FormattersFactory(
      new GeneralAsyncContextFormatter(),
      new HttpSecurityHeadersFormatter(options.elkLoggerConfig),
    );
  }
}
