import { IKeyValue } from 'src/modules/common';
import { BaseErrorObjectFormatter } from 'src/modules/elk-logger';

export class MockErrorFormatter extends BaseErrorObjectFormatter {
  constructor(private readonly fieldName: string = 'fieldName') {
    super();
  }

  setUnknownFormatter(): void {}

  isInstanceOf(obj: unknown): obj is object {
    return true;
  }

  transform(): IKeyValue<unknown> {
    return {
      field: this.fieldName,
    };
  }
}
