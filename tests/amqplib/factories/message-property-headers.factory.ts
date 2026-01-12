import { Factory } from 'fishery';
import { MessagePropertyHeaders, XDeath } from 'amqplib';
import { faker } from '@faker-js/faker';

export interface MessagePropertyHeadersFactoryOptions {
  firstDeathExchange?: boolean | string;
  firstDeathQueue: boolean | string;
  firstDeathReason: boolean | string;
  death?: boolean | XDeath | XDeath[];
}

export const messagePropertyHeadersFactory = Factory.define<
  MessagePropertyHeaders,
  MessagePropertyHeadersFactoryOptions
>(({ transientParams }) => {
  const tgt: MessagePropertyHeaders = {};

  if (transientParams.firstDeathExchange === true || typeof transientParams.firstDeathExchange === 'string') {
    tgt['x-first-death-exchange'] =
      transientParams.firstDeathExchange === true ? faker.string.alpha(5) : transientParams.firstDeathExchange;
  }

  if (transientParams.firstDeathQueue === true || typeof transientParams.firstDeathQueue === 'string') {
    tgt['x-first-death-queue'] =
      transientParams.firstDeathQueue === true ? faker.string.alpha(5) : transientParams.firstDeathQueue;
  }

  if (transientParams.firstDeathReason === true || typeof transientParams.firstDeathReason === 'string') {
    tgt['x-first-death-reason'] =
      transientParams.firstDeathReason === true ? faker.string.alpha(5) : transientParams.firstDeathReason;
  }

  if (transientParams.death === true) {
    tgt['x-death'] = [
      {
        count: faker.number.int(),
        reason: 'rejected',
        queue: faker.string.alpha(5),
        time: {
          '!': 'timestamp',
          value: faker.number.int(),
        },
        exchange: faker.string.alpha(5),
        'original-expiration': faker.number.int().toString(),
        'routing-keys': [faker.string.alpha(5)],
      },
    ];
  } else if (transientParams.death !== undefined && typeof transientParams.death === 'object') {
    tgt['x-death'] = Array.isArray(transientParams.death) ? transientParams.death : [transientParams.death];
  }

  return tgt;
});
