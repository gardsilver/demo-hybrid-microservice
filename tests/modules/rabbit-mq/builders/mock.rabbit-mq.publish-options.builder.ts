import { IRabbitMqPublishOptionsBuilder } from 'src/modules/rabbit-mq/rabbit-mq-common';

export class MockRabbitMqPublishOptionsBuilder implements IRabbitMqPublishOptionsBuilder {
  build = jest.fn();
}
