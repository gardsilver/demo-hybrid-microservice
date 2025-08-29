import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { IElkLoggerService, IElkLoggerServiceBuilder, ILogFields } from 'src/modules/elk-logger';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { LoggingValidationPipe } from './logging-validation.pipe';

describe(LoggingValidationPipe.name, () => {
  let logger: IElkLoggerService;
  let loggerBuilder: IElkLoggerServiceBuilder;

  beforeEach(async () => {
    logger = new MockElkLoggerService();
    loggerBuilder = {
      build: () => logger,
    } as IElkLoggerServiceBuilder;

    jest.clearAllMocks();
  });

  it('init', async () => {
    const spy = jest.spyOn(loggerBuilder, 'build');

    new LoggingValidationPipe(loggerBuilder, { index: 'custom field' } as ILogFields);

    expect(spy).toHaveBeenCalledWith({
      module: `LoggingValidationPipe.transform`,
      index: 'custom field',
    });
  });

  it('transform success', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spy = jest.spyOn(ValidationPipe.prototype, 'transform').mockImplementation(() => ({}) as any);
    const spyLogger = jest.spyOn(logger, 'error');

    const pipe = new LoggingValidationPipe(loggerBuilder, { index: 'custom field' } as ILogFields);

    pipe.transform(
      {
        status: 'ok',
      },
      {} as ArgumentMetadata,
    );

    expect(spy).toHaveBeenCalledWith(
      {
        status: 'ok',
      },
      {},
    );

    expect(spyLogger).toHaveBeenCalledTimes(0);
  });

  it('transform error', async () => {
    const error = new Error('Test Error');
    const spy = jest.spyOn(ValidationPipe.prototype, 'transform').mockImplementation(() => {
      throw error;
    });
    const spyLogger = jest.spyOn(logger, 'error');

    const pipe = new LoggingValidationPipe(loggerBuilder, { index: 'custom field' } as ILogFields);

    let exception;
    try {
      await pipe.transform({ status: 'ok' }, {} as ArgumentMetadata);
    } catch (e) {
      exception = e;
    }
    expect(exception).toEqual(error);

    expect(spy).toHaveBeenCalledWith(
      {
        status: 'ok',
      },
      {},
    );

    expect(spyLogger).toHaveBeenCalledWith('DTO validation error', {
      payload: {
        data: {
          status: 'ok',
        },
        error,
      },
    });
  });
});
