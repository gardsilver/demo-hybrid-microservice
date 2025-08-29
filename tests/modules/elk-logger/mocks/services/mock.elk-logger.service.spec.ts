import { MockElkLoggerService } from './mock.elk-logger.service';

describe(MockElkLoggerService.name, () => {
  let spyLogWriter;

  let logger: MockElkLoggerService;

  beforeEach(async () => {
    logger = new MockElkLoggerService();

    spyLogWriter = jest.spyOn(process['stdout'], 'write').mockImplementation(() => true);
  });

  it('init', async () => {
    expect(logger).toBeDefined();

    logger.getLastLogRecord();
    logger.addDefaultLogFields();
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
