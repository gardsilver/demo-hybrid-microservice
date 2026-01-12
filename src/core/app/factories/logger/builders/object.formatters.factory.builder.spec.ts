import { BufferObjectFormatter } from 'src/modules/common/formatters';
import { ValidationErrorItemObjectFormatter } from 'src/modules/database';
import { MetadataObjectFormatter } from 'src/modules/grpc/grpc-common';
import { KafkaJsMessagesObjectFormatter } from 'src/modules/kafka/kafka-common';
import { ObjectFormattersFactoryBuilder } from './object.formatters.factory.builder';
import { ObjectFormattersFactory } from '../object.formatters.factory';

describe(ObjectFormattersFactoryBuilder.name, () => {
  it('build', async () => {
    const service = ObjectFormattersFactoryBuilder.build();

    expect(service instanceof ObjectFormattersFactory).toBeTruthy();

    expect(service.getFormatters()).toEqual([
      new BufferObjectFormatter(),
      new MetadataObjectFormatter(),
      new KafkaJsMessagesObjectFormatter(),
      new ValidationErrorItemObjectFormatter(),
    ]);
  });
});
