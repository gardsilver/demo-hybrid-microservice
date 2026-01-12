import { Test } from '@nestjs/testing';
import { BufferObjectFormatter } from 'src/modules/common/formatters';
import { ValidationErrorItemObjectFormatter } from 'src/modules/database';
import { MetadataObjectFormatter } from 'src/modules/grpc/grpc-common';
import { KafkaJsMessagesObjectFormatter } from 'src/modules/kafka/kafka-common';
import { ObjectFormattersFactory } from './object.formatters.factory';

describe(ObjectFormattersFactory.name, () => {
  let service: ObjectFormattersFactory;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BufferObjectFormatter,
        MetadataObjectFormatter,
        KafkaJsMessagesObjectFormatter,
        ValidationErrorItemObjectFormatter,
        ObjectFormattersFactory,
      ],
    }).compile();
    service = module.get(ObjectFormattersFactory);
  });

  it('init', async () => {
    expect(service).toBeDefined();
  });

  it('getFormatters', async () => {
    const formatters = service.getFormatters();
    expect(formatters).toEqual([
      new BufferObjectFormatter(),
      new MetadataObjectFormatter(),
      new KafkaJsMessagesObjectFormatter(),
      new ValidationErrorItemObjectFormatter(),
    ]);
  });
});
