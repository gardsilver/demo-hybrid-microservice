import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { MAIN_SERVICE_NAME } from 'protos/compiled/demo/service/MainService';
import { RabbitMqClientService } from 'src/modules/rabbit-mq/rabbit-mq-client';
import { RabbitMqSearchRequest } from '../types/dto';
import { RabbitMqService } from './rabbit-mq.service';

describe(RabbitMqService.name, () => {
  let clientService: RabbitMqClientService;
  let service: RabbitMqService;
  let request: RabbitMqSearchRequest;

  beforeEach(async () => {
    clientService = {
      request: () => {},
    } as unknown as RabbitMqClientService;

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: RabbitMqClientService,
          useValue: clientService,
        },
        RabbitMqService,
      ],
    }).compile();

    service = module.get(RabbitMqService);

    request = {
      query: faker.string.alpha(6),
    };
  });

  it('init', async () => {
    expect(service).toBeDefined();
  });

  it('search success', async () => {
    const spy = jest.spyOn(clientService, 'request').mockImplementation(async () => true);

    const result = await service.search(request);

    expect(result).toBeTruthy();
    expect(spy).toHaveBeenCalledWith({
      exchange: MAIN_SERVICE_NAME,
      routingKey: 'find.request',
      content: { query: request.query },
    });
  });

  it('search not found', async () => {
    const spy = jest.spyOn(clientService, 'request').mockImplementation(async () => false);

    const result = await service.search(request);

    expect(result).toBeFalsy();
    expect(spy).toHaveBeenCalledWith({
      exchange: MAIN_SERVICE_NAME,
      routingKey: 'find.request',
      content: { query: request.query },
    });
  });
});
