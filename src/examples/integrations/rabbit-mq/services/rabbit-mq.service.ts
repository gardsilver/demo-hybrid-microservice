import { Injectable } from '@nestjs/common';
import { MAIN_SERVICE_NAME, MainRequest } from 'protos/compiled/demo/service/MainService';
import { RabbitMqClientService } from 'src/modules/rabbit-mq/rabbit-mq-client';
import { RabbitMqSearchRequest } from '../types/dto';

@Injectable()
export class RabbitMqService {
  constructor(private readonly clientService: RabbitMqClientService) {}

  async search(request: RabbitMqSearchRequest): Promise<boolean> {
    return this.clientService.request<MainRequest>({
      exchange: MAIN_SERVICE_NAME,
      routingKey: 'find.request',
      content: { query: request.query },
    });
  }
}
