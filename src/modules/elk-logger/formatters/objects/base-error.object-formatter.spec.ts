import { IKeyValue } from 'src/modules/common';
import { MockUnknownFormatter } from 'tests/modules/elk-logger';
import { BaseErrorObjectFormatter } from './base-error.object-formatter';
import { IUnknownFormatter } from '../../types/elk-logger.types';

class TestErrorFormatter extends BaseErrorObjectFormatter {
  canFormat(obj: unknown): obj is object {
    return false;
  }

  transform(): IKeyValue<unknown> {
    return {};
  }
}

describe(BaseErrorObjectFormatter.name, () => {
  let unknownFormatter: IUnknownFormatter;
  let formatter: TestErrorFormatter;

  beforeEach(async () => {
    unknownFormatter = new MockUnknownFormatter();
    formatter = new TestErrorFormatter();
  });

  it('setUnknownFormatter', async () => {
    const spySetUnknownFormatter = jest.spyOn(BaseErrorObjectFormatter.prototype, 'setUnknownFormatter');

    expect(formatter['unknownFormatter']).toBeUndefined();
    formatter.setUnknownFormatter(unknownFormatter);
    expect(formatter['unknownFormatter']).toEqual(unknownFormatter);

    expect(spySetUnknownFormatter).toHaveBeenCalledWith(unknownFormatter);
  });
});
