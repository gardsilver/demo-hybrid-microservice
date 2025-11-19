import { Injectable } from '@nestjs/common';
import { ObjectFormatter } from 'src/modules/elk-logger';
import { ValidationErrorItemObjectFormatter } from 'src/modules/database';
import { MetadataObjectFormatter } from 'src/modules/grpc/grpc-common';
import { KafkaJsMessagesObjectFormatter } from 'src/modules/kafka/kafka-common';

@Injectable()
export class ObjectFormattersFactory {
  constructor(
    protected readonly metadataObjectFormatter: MetadataObjectFormatter,
    protected readonly kafkaJsMessagesObjectFormatter: KafkaJsMessagesObjectFormatter,
    protected readonly validationErrorItemObjectFormatter: ValidationErrorItemObjectFormatter,
  ) {}

  getFormatters(): ObjectFormatter[] {
    return [this.metadataObjectFormatter, this.kafkaJsMessagesObjectFormatter, this.validationErrorItemObjectFormatter];
  }
}
