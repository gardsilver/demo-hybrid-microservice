import { Injectable } from '@nestjs/common';
import { IRabbitMqMessagePropertiesToAsyncContextAdapter, IRabbitMqMessageProperties } from '../types/types';
import { RabbitMqMessageHelper } from '../helpers/rabbit-mq.message.helper';
import { IRabbitMqAsyncContext } from '../types/rabbit-mq.async-context.type';

@Injectable()
export class RabbitMqMessagePropertiesToAsyncContextAdapter implements IRabbitMqMessagePropertiesToAsyncContextAdapter {
  adapt(properties: IRabbitMqMessageProperties): IRabbitMqAsyncContext {
    return RabbitMqMessageHelper.toAsyncContext<IRabbitMqAsyncContext>(properties);
  }
}
