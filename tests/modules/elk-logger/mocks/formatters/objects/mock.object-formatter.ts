import { IKeyValue } from 'src/modules/common';
import { ObjectFormatter } from 'src/modules/elk-logger';

export class MockObjectFormatter extends ObjectFormatter {
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
