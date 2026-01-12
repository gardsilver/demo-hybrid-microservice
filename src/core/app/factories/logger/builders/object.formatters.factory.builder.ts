import { BufferObjectFormatter } from 'src/modules/common/formatters';
import { ValidationErrorItemObjectFormatter } from 'src/modules/database';
import { MetadataObjectFormatter } from 'src/modules/grpc/grpc-common';
import { KafkaJsMessagesObjectFormatter } from 'src/modules/kafka/kafka-common';
import { ObjectFormattersFactory } from '../object.formatters.factory';

export abstract class ObjectFormattersFactoryBuilder {
  public static build(): ObjectFormattersFactory {
    return new ObjectFormattersFactory(
      new BufferObjectFormatter(),
      new MetadataObjectFormatter(),
      new KafkaJsMessagesObjectFormatter(),
      new ValidationErrorItemObjectFormatter(),
    );
  }
}
