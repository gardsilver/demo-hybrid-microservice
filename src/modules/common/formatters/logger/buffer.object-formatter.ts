import { Injectable } from '@nestjs/common';
import { IKeyValue } from 'src/modules/common';
import { BaseObjectFormatter } from 'src/modules/elk-logger';

@Injectable()
export class BufferObjectFormatter extends BaseObjectFormatter<Buffer> {
  isInstanceOf(obj: unknown): obj is Buffer {
    return Buffer.isBuffer(obj);
  }

  transform(from: Buffer): unknown | IKeyValue<unknown> {
    return `[Buffer] ${from.toString()}`;
  }
}
