import { IKeyValue } from 'src/modules/common';
import { IUnknownFormatter } from 'src/modules/elk-logger';

export class MockUnknownFormatter implements IUnknownFormatter {
  constructor(private readonly fieldName: string = 'fieldName') {}

  transform(): unknown | IKeyValue<unknown> {
    return {
      field: this.fieldName,
    };
  }
}
