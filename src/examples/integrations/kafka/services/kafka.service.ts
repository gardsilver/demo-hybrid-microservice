import { Injectable } from '@nestjs/common';
import { MainRequest } from 'protos/compiled/demo/service/MainService';
import { KafkaClientService } from 'src/modules/kafka/kafka-client';
import { KafkaSearchRequest } from '../types/dto';
import { TraceSpanHelper } from 'src/modules/elk-logger';
import { KafkaAsyncContext } from 'src/modules/kafka/kafka-common';

@Injectable()
export class KafkaService {
  constructor(private readonly kafkaClientService: KafkaClientService) {}

  async search(request: KafkaSearchRequest): Promise<boolean> {
    const response = await this.kafkaClientService.request<MainRequest>({
      topic: 'DemoRequest',
      data: {
        key: KafkaAsyncContext.instance.extend()['correlationId'],
        value: { query: request.query },
        headers: {
          'x-demo-id': TraceSpanHelper.generateRandomValue(),
        },
      },
    });

    return response ? true : false;
  }
}
