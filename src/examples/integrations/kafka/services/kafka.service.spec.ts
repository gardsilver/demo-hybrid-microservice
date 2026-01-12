import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { IKafkaAsyncContext, KafkaAsyncContext } from 'src/modules/kafka/kafka-common';
import { KafkaClientService } from 'src/modules/kafka/kafka-client';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { KafkaSearchRequest } from '../types/dto';
import { KafkaService } from './kafka.service';

describe(KafkaService.name, () => {
  let mockUuid: string;
  let asyncContext: IKafkaAsyncContext;
  let kafkaClientService: KafkaClientService;
  let kafkaService: KafkaService;
  let request: KafkaSearchRequest;

  beforeEach(async () => {
    kafkaClientService = {
      request: () => {},
    } as undefined as KafkaClientService;

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: KafkaClientService,
          useValue: kafkaClientService,
        },
        KafkaService,
      ],
    }).compile();

    kafkaService = module.get(KafkaService);

    asyncContext = generalAsyncContextFactory.build(
      {},
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          initialSpanId: undefined,
          parentSpanId: undefined,
          requestId: undefined,
          correlationId: undefined,
        },
      },
    );
    asyncContext.replyTopic = faker.string.alpha(4);
    asyncContext.replyPartition = faker.number.int(2);
    request = {
      query: faker.string.alpha(6),
    };

    mockUuid = faker.string.uuid();
    jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockUuid);
  });

  it('init', async () => {
    expect(kafkaService).toBeDefined();
  });

  it('search success', async () => {
    const spy = jest.spyOn(kafkaClientService, 'request').mockImplementation(async () => {
      return [];
    });

    const result = await KafkaAsyncContext.instance.runWithContextAsync(
      () => kafkaService.search(request),
      asyncContext,
    );

    expect(result).toBeTruthy();
    expect(spy).toHaveBeenCalledWith({
      topic: 'DemoRequest',
      data: {
        key: asyncContext.correlationId,
        value: { query: request.query },
        headers: {
          'x-demo-id': mockUuid,
        },
      },
    });
  });

  it('search not found', async () => {
    const spy = jest.spyOn(kafkaClientService, 'request').mockImplementation(async () => {
      return undefined;
    });

    const result = await KafkaAsyncContext.instance.runWithContextAsync(
      () => kafkaService.search(request),
      asyncContext,
    );

    expect(result).toBeFalsy();
    expect(spy).toHaveBeenCalledWith({
      topic: 'DemoRequest',
      data: {
        key: asyncContext.correlationId,
        value: { query: request.query },
        headers: {
          'x-demo-id': mockUuid,
        },
      },
    });
  });
});
