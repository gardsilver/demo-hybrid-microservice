import { Test } from '@nestjs/testing';
import { ValidationErrorItemObjectFormatter } from 'src/modules/database';
import { MetadataObjectFormatter } from 'src/modules/grpc/grpc-common';
import { KafkaJsMessagesObjectFormatter } from 'src/modules/kafka/kafka-common';
import { ObjectFormattersService } from './object.formatters.service';

describe(ObjectFormattersService.name, () => {
  let service: ObjectFormattersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MetadataObjectFormatter,
        KafkaJsMessagesObjectFormatter,
        ValidationErrorItemObjectFormatter,
        ObjectFormattersService,
      ],
    }).compile();
    service = module.get(ObjectFormattersService);
  });

  it('init', async () => {
    expect(service).toBeDefined();
  });

  it('getFormatters', async () => {
    const formatters = service.getFormatters();
    expect(formatters).toEqual([
      new MetadataObjectFormatter(),
      new KafkaJsMessagesObjectFormatter(),
      new ValidationErrorItemObjectFormatter(),
    ]);
  });
});
