import { Injectable } from '@nestjs/common';
import { BaseObjectFormatter } from 'src/modules/elk-logger';
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

  getFormatters(): BaseObjectFormatter[] {
    return [this.metadataObjectFormatter, this.kafkaJsMessagesObjectFormatter, this.validationErrorItemObjectFormatter];
  }
}
