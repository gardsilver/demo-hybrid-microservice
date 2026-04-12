import { Server } from '@nestjs/microservices';
import { KafkaOptionsBuilder } from 'src/modules/kafka/kafka-common';
import { KafkaServerHealthIndicator } from './kafka-server.health-indicator';
import { KafkaServerStatusService } from './kafka-server.status.service';

describe(KafkaServerStatusService.name, () => {
  let optionsBuilder: KafkaOptionsBuilder;
  let server: Server;
  let indicator: KafkaServerHealthIndicator;
  let service: KafkaServerStatusService;

  beforeEach(async () => {
    service = new KafkaServerStatusService();

    optionsBuilder = {
      stop: jest.fn(),
    } as unknown as KafkaOptionsBuilder;

    server = {
      close: jest.fn(),
    } as unknown as Server;

    indicator = {} as unknown as KafkaServerHealthIndicator;

    jest.clearAllMocks();
  });

  it('default', async () => {
    const spyClose = jest.spyOn(server, 'close');
    const spyStop = jest.spyOn(optionsBuilder, 'stop');

    expect(service.getHealthIndicators()).toEqual([]);

    await service.beforeDestroy();

    expect(spyClose).toHaveBeenCalledTimes(0);
    expect(spyStop).toHaveBeenCalledTimes(0);

    service.addKafkaServices('server', server, optionsBuilder, indicator);

    expect(service.getHealthIndicators()).toEqual([indicator]);

    await service.beforeDestroy();

    expect(spyClose).toHaveBeenCalledTimes(1);
    expect(spyStop).toHaveBeenCalledTimes(1);
  });
});
