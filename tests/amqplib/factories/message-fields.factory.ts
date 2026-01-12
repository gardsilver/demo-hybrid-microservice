import { Factory } from 'fishery';
import { CommonMessageFields, MessageFields } from 'amqplib';
import { faker } from '@faker-js/faker';

const commonMessageFieldsFactory = Factory.define<CommonMessageFields, CommonMessageFields>(({ transientParams }) => {
  return {
    deliveryTag: transientParams?.deliveryTag ?? faker.number.int(),
    redelivered: transientParams?.redelivered ?? faker.number.int(2) > 1,
    exchange: transientParams?.exchange ?? faker.string.alpha(6),
    routingKey: transientParams?.routingKey ?? faker.string.alpha(6),
  };
});

export const messageFieldsFactory = Factory.define<MessageFields, MessageFields>(({ transientParams }) => {
  return {
    ...commonMessageFieldsFactory.build({}, { transient: transientParams }),
    messageCount: 'messageCount' in transientParams ? (transientParams?.messageCount ?? faker.number.int()) : undefined,
    consumerTag: 'consumerTag' in transientParams ? (transientParams?.consumerTag ?? faker.string.alpha(6)) : undefined,
  };
});
