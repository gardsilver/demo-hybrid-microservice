import { MockNestElkLoggerService } from './mock.nest.elk-logger.service';

describe(MockNestElkLoggerService.name, () => {
  let spyLogWriter;

  let logger: MockNestElkLoggerService;

  beforeEach(async () => {
    logger = new MockNestElkLoggerService();

    spyLogWriter = jest.spyOn(process['stdout'], 'write').mockImplementation(() => true);
  });

  it('init', async () => {
    expect(logger).toBeDefined();

    logger.getLastLogRecord();
    logger.setLogLevels();
    logger.log();
    logger.trace();
    logger.debug();
    logger.info();
    logger.warn();
    logger.error();
    logger.fatal();

    expect(spyLogWriter).toHaveBeenCalledTimes(0);
    expect(logger.getLastLogRecord()).toBeUndefined();
  });
});
