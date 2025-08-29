import { IKeyValue } from 'src/modules/common';
import { IObjectFormatter } from 'src/modules/elk-logger';

export class MockObjectFormatter implements IObjectFormatter {
  constructor(private readonly fieldName: string = 'fieldName') {}

  canFormat(obj: unknown): obj is object {
    return true;
  }

  transform(): IKeyValue<unknown> {
    return {
      field: this.fieldName,
    };
  }
}
