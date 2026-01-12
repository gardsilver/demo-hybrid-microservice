import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { RabbitMqServerStatusService } from './rabbit-mq-server.status.service';
import { RabbitMqServer } from './rabbit-mq-server';
import { RabbitMqHealthIndicator } from './rabbit-mq.health-indicator';

describe(RabbitMqServerStatusService.name, () => {
  let spyClose;
  let serverName: string;
  let server: RabbitMqServer;
  let indicator: RabbitMqHealthIndicator;
  let statusService: RabbitMqServerStatusService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RabbitMqServerStatusService],
    }).compile();

    statusService = module.get(RabbitMqServerStatusService);

    spyClose = jest.fn();

    serverName = faker.string.alpha(5);

    server = {
      close: () => spyClose(),
    } as undefined as RabbitMqServer;

    indicator = {} as undefined as RabbitMqHealthIndicator;

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(statusService).toBeDefined();
    expect(statusService.getHealthIndicators()).toEqual([]);
    await statusService.beforeDestroy();
    expect(spyClose).toHaveBeenCalledTimes(0);
  });

  it('default', async () => {
    statusService.addRabbitMqServices(serverName, server, indicator);
    expect(statusService.getHealthIndicators()).toEqual([indicator]);
    await statusService.beforeDestroy();
    expect(spyClose).toHaveBeenCalledTimes(1);
  });
});
