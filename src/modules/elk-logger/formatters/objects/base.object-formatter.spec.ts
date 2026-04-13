import { IKeyValue } from 'src/modules/common';
import { MockUnknownFormatter } from 'tests/modules/elk-logger';
import { IUnknownFormatter } from '../../types/elk-logger.types';
import { BaseObjectFormatter } from './base.object-formatter';

class TestFormatter extends BaseObjectFormatter {
  isInstanceOf(_obj: unknown): _obj is object {
    return false;
  }

  transform(): IKeyValue<unknown> {
    return {};
  }
}

describe(BaseObjectFormatter.name, () => {
  let unknownFormatter: IUnknownFormatter;
  let formatter: TestFormatter;

  beforeEach(async () => {
    unknownFormatter = new MockUnknownFormatter();
    formatter = new TestFormatter();
  });

  it('setUnknownFormatter', async () => {
    const spySetUnknownFormatter = jest.spyOn(BaseObjectFormatter.prototype, 'setUnknownFormatter');

    expect(formatter['unknownFormatter']).toBeUndefined();
    formatter.setUnknownFormatter(unknownFormatter);
    expect(formatter['unknownFormatter']).toEqual(unknownFormatter);

    expect(spySetUnknownFormatter).toHaveBeenCalledWith(unknownFormatter);
  });
});
