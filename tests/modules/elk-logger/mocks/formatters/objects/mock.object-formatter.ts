import { IKeyValue } from 'src/modules/common';
import { BaseObjectFormatter } from 'src/modules/elk-logger';

export class MockObjectFormatter extends BaseObjectFormatter {
  constructor(private readonly fieldName: string = 'fieldName') {
    super();
  }

  isInstanceOf(obj: unknown): obj is object {
    return true;
  }

  transform(): IKeyValue<unknown> {
    return {
      field: this.fieldName,
    };
  }
}
