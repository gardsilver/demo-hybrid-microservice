import { Test } from '@nestjs/testing';
import { RecordEncodeFormattersFactory } from './record-encode.formatters.factory';
import { FullFormatter } from './record-encodes/full.formatter';
import { SimpleFormatter } from './record-encodes/simple.formatter';
import { ShortFormatter } from './record-encodes/short.formatter';
import { LogFormat } from '../types/elk-logger.types';

describe(RecordEncodeFormattersFactory.name, () => {
  let recordEncodeFormattersFactory: RecordEncodeFormattersFactory;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [FullFormatter, SimpleFormatter, ShortFormatter, RecordEncodeFormattersFactory],
    }).compile();

    recordEncodeFormattersFactory = module.get(RecordEncodeFormattersFactory);
  });

  it('init', async () => {
    expect(recordEncodeFormattersFactory).toBeDefined();
  });

  it('custom', async () => {
    expect(recordEncodeFormattersFactory.getFormatter(LogFormat.FULL) instanceof FullFormatter).toBeTruthy();
    expect(recordEncodeFormattersFactory.getFormatter(LogFormat.SIMPLE) instanceof SimpleFormatter).toBeTruthy();
    expect(recordEncodeFormattersFactory.getFormatter(LogFormat.SHORT) instanceof ShortFormatter).toBeTruthy();
    expect(recordEncodeFormattersFactory.getFormatter(LogFormat.NULL)).toBeUndefined();
  });
});
