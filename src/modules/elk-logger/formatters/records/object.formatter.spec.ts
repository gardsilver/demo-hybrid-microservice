import { DateTimestamp } from 'src/modules/date-timestamp';
import { MockUnknownFormatter } from 'tests/modules/elk-logger';
import { ILogRecord, IUnknownFormatter } from '../../types/elk-logger.types';
import { ObjectFormatter } from './object.formatter';

describe(ObjectFormatter.name, () => {
  let unknownFormatter: IUnknownFormatter;
  let formatter: ObjectFormatter;

  beforeEach(async () => {
    unknownFormatter = new MockUnknownFormatter();
    formatter = new ObjectFormatter(unknownFormatter);
    jest.clearAllMocks();
  });

  it('transform', async () => {
    const current = new DateTimestamp();
    const error = new Error('test');

    const logRecord: ILogRecord = {
      businessData: error,
      payload: current,
    } as undefined as ILogRecord;

    expect(formatter.transform(logRecord)).toEqual({
      businessData: {
        field: 'fieldName',
      },
      payload: {
        field: 'fieldName',
      },
    });

    jest.spyOn(unknownFormatter, 'transform').mockImplementation((value) => {
      if (typeof value === 'object') {
        if (!(value instanceof Error)) {
          return {
            field: 'fieldName',
          };
        }
      }
      return value;
    });

    expect(formatter.transform(logRecord)).toEqual({
      businessData: error,
      payload: {
        field: 'fieldName',
      },
    });
  });
});
