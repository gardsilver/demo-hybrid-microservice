import { IKeyValue } from 'src/modules/common';
import { IErrorFormatter } from 'src/modules/elk-logger';

export class MockErrorFormatter implements IErrorFormatter {
  constructor(private readonly fieldName: string = 'fieldName') {}

  setUnknownFormatter(): void {}

  canFormat(obj: unknown): obj is object {
    return true;
  }

  transform(): IKeyValue<unknown> {
    return {
      field: this.fieldName,
    };
  }
}
