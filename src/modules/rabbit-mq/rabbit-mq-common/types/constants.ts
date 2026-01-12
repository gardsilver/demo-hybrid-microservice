import { IRabbitMqUrl } from './types';

export const RABBIT_MQ_DEFAULT_URL_PARAMS: IRabbitMqUrl = {
  protocol: 'amqp',
  hostname: 'localhost',
  port: 5672,
  vhost: '/',
};
