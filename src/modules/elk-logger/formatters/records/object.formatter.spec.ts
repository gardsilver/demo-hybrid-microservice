import { MockObjectFormatter } from 'tests/modules/elk-logger';
import { ObjectFormatter } from './object.formatter';
import { ILogRecord } from '../../types/elk-logger.types';

describe(ObjectFormatter.name, () => {
  let formatter: ObjectFormatter;

  beforeEach(async () => {
    formatter = new ObjectFormatter([new MockObjectFormatter()]);
    jest.clearAllMocks();
  });

  it('transform', async () => {
    const logRecord: ILogRecord = {
      businessData: {
        status: 'ok',
        error: new Error('test'),
      },
      payload: {
        details: {
          message: 'message',
          array: ['success', 123, { data: {} }],
        },
      },
    } as undefined as ILogRecord;

    expect(formatter.transform(logRecord)).toEqual({
      businessData: {
        field: 'fieldName',
      },
      payload: {
        field: 'fieldName',
      },
    });

    jest.spyOn(MockObjectFormatter.prototype, 'canFormat').mockImplementation((obj) => obj instanceof Error);

    expect(formatter.transform(logRecord)).toEqual({
      businessData: {
        status: 'ok',
        error: {
          field: 'fieldName',
        },
      },
      payload: {
        details: {
          message: 'message',
          array: ['success', 123, { data: {} }],
        },
      },
    });
  });
});
