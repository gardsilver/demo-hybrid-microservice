import * as moment from 'moment';
import { DateTimestamp } from 'src/modules/date-timestamp';
import {
  CheckObjectsType,
  MomentCheckObject,
  isObjectInstanceOf,
  circularReplacerBuilder,
  circularRemove,
} from './circular-normalizers';

class List {
  public next: null | List;
  public val;

  constructor(val, next?: List) {
    this.val = val;
    this.next = next ?? null;
  }
}

describe('Circular normalizers', () => {
  let item, item1, item2, item3, error1, error2, current, formatCurrent;

  beforeEach(async () => {
    item1 = new List(10);
    item3 = new List(30, item1);
    item2 = new List(20, item3);
    item1.next = item2;

    current = new Date();

    error1 = new Error('Test 1');
    error2 = new Error('Test 2');

    item = new List({
      error: error1,
      data: {
        message: 'debug',
        error: error2,
        items: [1, 2, error1],
        current,
      },
    });

    item.next = item;

    formatCurrent = `${moment(current).utcOffset(0).format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`;
  });

  it(isObjectInstanceOf.name, async () => {
    const now = new DateTimestamp();
    const current = now.getMoment().clone();
    const checkList: Array<CheckObjectsType> = [DateTimestamp, new MomentCheckObject()];

    expect(isObjectInstanceOf(now, checkList)).toBeTruthy();
    expect(isObjectInstanceOf(current, checkList)).toBeTruthy();
    expect(isObjectInstanceOf(new Date(), checkList)).toBeTruthy();
    expect(isObjectInstanceOf(new List(1), checkList)).toBeFalsy();
  });

  it(circularReplacerBuilder.name, async () => {
    const copyItem = structuredClone(item);
    const copyItem1 = structuredClone(item1);
    const record = { test: 'test', test2: { test: 'test' } };

    expect(JSON.stringify(record, circularReplacerBuilder())).toBe('{"test":"test","test2":{"test":"test"}}');
    expect(JSON.stringify(record, circularReplacerBuilder({ template: true }))).toBe(
      '{"test":"test","test2":{"test":"test"}}',
    );

    expect(JSON.stringify('record', circularReplacerBuilder())).toBe('"record"');
    expect(JSON.stringify('record', circularReplacerBuilder({ template: true }))).toBe('"record"');

    expect(JSON.stringify(item1, circularReplacerBuilder())).toBe('{"next":{"next":{"val":30},"val":20},"val":10}');
    expect(JSON.stringify(item1, circularReplacerBuilder({ template: true }))).toBe(
      '{"next":{"next":{"next":"Circular[* 1]","val":30},"val":20},"val":10}',
    );

    expect(JSON.stringify(item, circularReplacerBuilder())).toBe(
      `{"val":{"error":{},"data":{"message":"debug","error":{},"items":[1,2,null],"current":"${formatCurrent}"}}}`,
    );

    expect(JSON.stringify(item, circularReplacerBuilder({ template: true }))).toBe(
      `{"next":"Circular[* 1]","val":{"error":{},"data":{"message":"debug","error":{},"items":[1,2,"Circular[* 3]"],"current":"${formatCurrent}"}}}`,
    );

    expect(JSON.stringify(item, circularReplacerBuilder({ template: '--- Circular[* {{index}}] ---' }))).toBe(
      `{"next":"--- Circular[* 1] ---","val":{"error":{},"data":{"message":"debug","error":{},"items":[1,2,"--- Circular[* 3] ---"],"current":"${formatCurrent}"}}}`,
    );

    expect(item1).toEqual(copyItem1);
    expect(item).toEqual(copyItem);
  });

  it(circularRemove.name + ' simple', async () => {
    const copyItem1 = structuredClone(item1);
    const test1 = circularRemove(item1);
    const test2 = circularRemove(item1, { template: true });
    const test3 = circularRemove(item1, { template: '--- Circular[* {{index}}] ---' });

    expect(item1).toEqual(copyItem1);
    expect(test1).toEqual({ next: { next: { val: 30 }, val: 20 }, val: 10 });
    expect(test2).toEqual({ next: { next: { next: 'Circular[* 1]', val: 30 }, val: 20 }, val: 10 });
    expect(test3).toEqual({ next: { next: { next: '--- Circular[* 1] ---', val: 30 }, val: 20 }, val: 10 });
  });

  it(circularRemove.name + ' with Errors', async () => {
    const copyItem = structuredClone(item);
    const test = circularRemove(item, { template: true });

    expect(copyItem).toEqual(item);
    expect(test).toEqual({
      next: 'Circular[* 1]',
      val: {
        error: error1,
        data: {
          message: 'debug',
          error: error2,
          items: [1, 2, 'Circular[* 3]'],
          current,
        },
      },
    });
  });

  it(circularRemove.name + ' with ignore objects', async () => {
    const dt = new DateTimestamp();

    item['current'] = dt;
    item.val.now = dt;

    const test = circularRemove(item, { template: true, ignoreObjects: [DateTimestamp] });

    expect(test).toEqual({
      next: 'Circular[* 1]',
      val: {
        error: error1,
        data: {
          message: 'debug',
          error: error2,
          items: [1, 2, 'Circular[* 3]'],
          current,
        },
        now: dt,
      },
      current: 'Circular[* 8]',
    });
  });
});
