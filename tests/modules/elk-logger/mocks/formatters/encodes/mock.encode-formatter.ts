import { IEncodeFormatter } from 'src/modules/elk-logger';

export class MockEncodeFormatter implements IEncodeFormatter {
  transform(from: string): string {
    return from;
  }
}
