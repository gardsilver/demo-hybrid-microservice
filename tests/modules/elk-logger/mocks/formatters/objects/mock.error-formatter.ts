import { IKeyValue } from 'src/modules/common';
import { ErrorFormatter } from 'src/modules/elk-logger';

export class MockErrorFormatter extends ErrorFormatter {
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
